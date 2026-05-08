import eventlet
eventlet.monkey_patch()

import os
import sys
import socket
import psutil
from app import socketio, app

def kill_process_on_port(port):
    """Find and kill processes listening on the specified port."""
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections(kind='inet'):
                if conn.laddr.port == port:
                    print(f"Found process {proc.info['name']} (PID: {proc.info['pid']}) using port {port}. Terminating...")
                    proc.terminate()
                    proc.wait(timeout=3)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
            continue

if __name__ == '__main__':
    port = 5050
    print(f"Checking for existing processes on port {port}...")
    kill_process_on_port(port)
    
    print(f"Starting tajweed.ai recitation backend on http://0.0.0.0:{port}")
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=True)
    except OSError as e:
        print(f"CRITICAL: Could not start server: {e}")
        sys.exit(1)
