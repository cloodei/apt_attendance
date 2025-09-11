import asyncio
import json
import logging
from typing import Dict, Set
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.signaling import TcpSocketSignaling
import base64
import threading
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="APT Attendance WebRTC Server")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for managing connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.peer_connections: Dict[str, RTCPeerConnection] = {}
        self.camera_active = False
        self.camera_thread = None
        self.camera_cap = None
        self.frame_lock = threading.Lock()
        self.current_frame = None

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.peer_connections:
            self.peer_connections[client_id].close()
            del self.peer_connections[client_id]
        logger.info(f"Client {client_id} disconnected")

    def start_camera(self):
        if not self.camera_active:
            self.camera_active = True
            self.camera_thread = threading.Thread(target=self._camera_loop)
            self.camera_thread.daemon = True
            self.camera_thread.start()
            logger.info("Camera started")

    def stop_camera(self):
        self.camera_active = False
        if self.camera_cap:
            self.camera_cap.release()
        logger.info("Camera stopped")

    def _camera_loop(self):
        self.camera_cap = cv2.VideoCapture(0)
        if not self.camera_cap.isOpened():
            logger.error("Failed to open camera")
            return

        # Set camera properties
        self.camera_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.camera_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.camera_cap.set(cv2.CAP_PROP_FPS, 30)

        while self.camera_active:
            ret, frame = self.camera_cap.read()
            if ret:
                with self.frame_lock:
                    self.current_frame = frame
            else:
                logger.error("Failed to read frame from camera")
                break
            time.sleep(1/30)  # 30 FPS

    def get_current_frame(self):
        with self.frame_lock:
            return self.current_frame.copy() if self.current_frame is not None else None

manager = ConnectionManager()

class CameraVideoStreamTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        self.frame_count = 0

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        # Get the current frame from the camera
        frame = manager.get_current_frame()
        if frame is None:
            # Return a black frame if no camera frame is available
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        else:
            # Resize frame to standard resolution
            frame = cv2.resize(frame, (1280, 720))
            # Convert BGR to RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Convert to VideoFrame
        from av import VideoFrame
        av_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        av_frame.pts = pts
        av_frame.time_base = time_base
        
        self.frame_count += 1
        return av_frame

@app.get("/")
async def get():
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>APT Attendance WebRTC Test</title>
    </head>
    <body>
        <h1>APT Attendance WebRTC Server</h1>
        <p>Server is running. Use the frontend to connect.</p>
    </body>
    </html>
    """)

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "offer":
                # Create peer connection
                pc = RTCPeerConnection()
                manager.peer_connections[client_id] = pc
                
                # Add video track
                video_track = CameraVideoStreamTrack()
                pc.addTrack(video_track)
                
                # Start camera if not already started
                if not manager.camera_active:
                    manager.start_camera()
                
                # Handle the offer
                offer = RTCSessionDescription(sdp=message["sdp"], type=message["type"])
                await pc.setRemoteDescription(offer)
                
                # Create answer
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                
                # Send answer back to client
                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "sdp": answer.sdp
                }))
                
            elif message["type"] == "ice-candidate":
                # Handle ICE candidate
                if client_id in manager.peer_connections:
                    pc = manager.peer_connections[client_id]
                    await pc.addIceCandidate(message["candidate"])
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)

@app.get("/api/status")
async def get_status():
    return {
        "camera_active": manager.camera_active,
        "active_connections": len(manager.active_connections),
        "peer_connections": len(manager.peer_connections)
    }

@app.post("/api/camera/start")
async def start_camera():
    if not manager.camera_active:
        manager.start_camera()
        return {"status": "Camera started"}
    return {"status": "Camera already active"}

@app.post("/api/camera/stop")
async def stop_camera():
    if manager.camera_active:
        manager.stop_camera()
        return {"status": "Camera stopped"}
    return {"status": "Camera already stopped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
