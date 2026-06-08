"""
WebSocket proxy — relays audio streaming between frontend and Model Server.
The frontend connects to ws://logic-server:8000/ws/stream,
this endpoint proxies all messages to ws://model-server:8888/ws/stream.
"""

import logging
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from app.config import get_settings

logger = logging.getLogger("tajweed.ws")

router = APIRouter()


@router.websocket("/ws/stream")
async def websocket_proxy(client_ws: WebSocket):
    """
    Bidirectional WebSocket proxy.
    Client (browser) ↔ Logic Server ↔ Model Server (Muaalem)
    """
    await client_ws.accept()
    settings = get_settings()
    model_ws_url = f"{settings.MODEL_SERVER_WS}/ws/stream"

    logger.info("Client WebSocket connected — proxying to %s", model_ws_url)

    try:
        async with websockets.connect(model_ws_url) as model_ws:
            # Two concurrent tasks: client→model and model→client

            async def client_to_model():
                """Forward messages from browser client to model server."""
                try:
                    while True:
                        message = await client_ws.receive()
                        if message.get("type") == "websocket.disconnect":
                            break
                        if "bytes" in message:
                            await model_ws.send(message["bytes"])
                        elif "text" in message:
                            await model_ws.send(message["text"])
                except WebSocketDisconnect:
                    logger.info("Client disconnected (client→model)")
                except Exception as e:
                    logger.error("Error in client→model: %s", e)

            async def model_to_client():
                """Forward messages from model server to browser client."""
                try:
                    async for msg in model_ws:
                        if isinstance(msg, bytes):
                            await client_ws.send_bytes(msg)
                        else:
                            await client_ws.send_text(msg)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("Model server disconnected (model→client)")
                except Exception as e:
                    logger.error("Error in model→client: %s", e)

            # Run both relay tasks concurrently
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(client_to_model()),
                    asyncio.create_task(model_to_client()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel the remaining task when one side disconnects
            for task in pending:
                task.cancel()

    except websockets.exceptions.InvalidURI:
        logger.error("Invalid Model Server WebSocket URL: %s", model_ws_url)
        try:
            await client_ws.close(code=1011, reason="Model server URL invalid")
        except Exception:
            pass
    except (OSError, websockets.exceptions.WebSocketException) as e:
        logger.error("Model Server not reachable or connection failed at %s: %s", model_ws_url, e)
        try:
            await client_ws.send_json({"type": "error", "message": "Model server not reachable"})
            await client_ws.close(code=1011, reason="Model server not reachable")
        except Exception:
            pass
    except Exception as e:
        logger.error("WebSocket proxy error: %s", e)
        try:
            await client_ws.close(code=1011, reason="Internal error")
        except Exception:
            pass
    finally:
        logger.info("WebSocket proxy session ended")
