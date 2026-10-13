import os
import sys

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    debug = os.getenv("FLASK_DEBUG", "1") == "1"

    if "PORT" in os.environ:
        port = int(os.environ["PORT"])
    else:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind((host, 5000))
            port = 5000
        except OSError:
            port = 5001
            print(f"[*] Port 5000 is occupied (macOS AirPlay / ControlCenter). Automatically falling back to port {port}.")
        finally:
            sock.close()

    print(f"[*] Starting SURAKSHA API Server on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)

