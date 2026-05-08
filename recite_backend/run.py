#!/home/harb/tajweed.ai/.venv/bin/python
"""run.py — Launch the recitation alignment server with Eventlet"""
import eventlet
eventlet.monkey_patch()

from app import socketio, app

if __name__ == '__main__':
    print("Starting tajweed.ai recitation backend on http://0.0.0.0:5050")
    socketio.run(app, host='0.0.0.0', port=5050)
