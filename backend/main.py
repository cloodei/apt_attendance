import json
import logging
from typing import Dict
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, VideoStreamTrack
# from aiortc.contrib.signaling import TcpSocketSignaling
# import base64
import threading
import time

url = 'http://10.2.88.228:8080/video'
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="APT Attendance WebRTC Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.peer_connections:
            await self.peer_connections[client_id].close()
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
            self.camera_cap = None
        logger.info("Camera stopped")
    
    async def cleanup(self):
        """Clean up all resources"""
        self.stop_camera()
        # Close all peer connections
        for client_id, pc in list(self.peer_connections.items()):
            try:
                await pc.close()
            except Exception as e:
                logger.error(f"Error closing peer connection for {client_id}: {e}")
        self.peer_connections.clear()
        self.active_connections.clear()

    def _camera_loop(self):
        self.camera_cap = cv2.VideoCapture(url)
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
            try:
                message = json.loads(data)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received from client {client_id}: {e}")
                continue
            
            # Validate message structure
            if not isinstance(message, dict) or "type" not in message:
                logger.error(f"Invalid message structure from client {client_id}: {message}")
                continue
            
            if message["type"] == "offer":
                try:
                    # Validate offer message structure
                    if "sdp" not in message or message["sdp"] is None:
                        logger.error(f"Invalid offer message: missing or null SDP for client {client_id}")
                        return
                    
                    # Validate SDP content
                    sdp_content = message["sdp"]
                    if not sdp_content.strip():
                        logger.error(f"Empty SDP content for client {client_id}")
                        return
                    
                    # Check if SDP contains media tracks (m= lines)
                    if "m=" not in sdp_content:
                        logger.error(f"SDP missing media tracks for client {client_id}. SDP content: {sdp_content}")
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "SDP offer is missing media tracks. Please ensure the client is requesting video/audio."
                        }))
                        return
                    
                    # Check if SDP contains video tracks specifically
                    if "m=video" not in sdp_content:
                        logger.warning(f"SDP missing video tracks for client {client_id}. Available tracks: {[line for line in sdp_content.split('\\n') if line.startswith('m=')]}")
                        # We'll still try to process it, but log the warning
                    
                    logger.info(f"Processing offer for client {client_id}")
                    
                    # Create peer connection
                    pc = RTCPeerConnection()

                    # Listen for newly gathered ICE candidates and forward them to the client
                    @pc.on("icecandidate")
                    async def on_icecandidate(candidate):
                        # When candidate is None it means ICE gathering is complete, we can ignore it
                        if candidate is not None:
                            try:
                                await websocket.send_text(json.dumps({
                                    "type": "ice-candidate",
                                    "candidate": {
                                        "candidate": candidate.candidate,
                                        "sdpMid": candidate.sdpMid,
                                        "sdpMLineIndex": candidate.sdpMLineIndex,
                                    }
                                }))
                                logger.debug(f"Sent ICE candidate to client {client_id}")
                            except Exception as ice_send_err:
                                logger.error(f"Failed to send ICE candidate: {ice_send_err}")
                    manager.peer_connections[client_id] = pc
                    
                    # Add video track
                    video_track = CameraVideoStreamTrack()
                    pc.addTrack(video_track)
                    
                    # Start camera if not already started
                    if not manager.camera_active:
                        manager.start_camera()
                    
                    # Handle the offer
                    logger.info(f"Creating RTCSessionDescription for client {client_id}")
                    try:
                        offer = RTCSessionDescription(sdp=message["sdp"], type=message["type"])
                    except Exception as sdp_error:
                        logger.error(f"Error creating RTCSessionDescription: {sdp_error}")
                        logger.error(f"SDP content: {message['sdp'][:200]}...")  # Log first 200 chars
                        raise sdp_error
                    
                    logger.info(f"Setting remote description for client {client_id}")
                    try:
                        await pc.setRemoteDescription(offer)
                    except Exception as desc_error:
                        logger.error(f"Error setting remote description: {desc_error}")
                        raise desc_error
                    
                    logger.info(f"Creating answer for client {client_id}")
                    # Create answer
                    answer = await pc.createAnswer()
                    
                    logger.info(f"Setting local description for client {client_id}")
                    try:
                        await pc.setLocalDescription(answer)
                    except Exception as local_desc_error:
                        logger.error(f"Error setting local description: {local_desc_error}")
                        # Send error message to client
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": f"Failed to set local description: {str(local_desc_error)}"
                        }))
                        raise local_desc_error
                    
                    logger.info(f"Sending answer to client {client_id}")
                    # Send answer back to client
                    await websocket.send_text(json.dumps({
                        "type": "answer",
                        "sdp": answer.sdp
                    }))
                    logger.info(f"Successfully processed offer for client {client_id}")
                    
                except Exception as e:
                    logger.error(f"Error handling offer for client {client_id}: {e}")
                    logger.error(f"Offer message: {message}")
                    if client_id in manager.peer_connections:
                        try:
                            await manager.peer_connections[client_id].close()
                        except Exception as close_error:
                            logger.error(f"Error closing peer connection: {close_error}")
                        del manager.peer_connections[client_id]
                
            elif message["type"] == "ice-candidate":
                # Handle ICE candidate
                if client_id in manager.peer_connections and "candidate" in message and message["candidate"] is not None:
                    pc = manager.peer_connections[client_id]
                    try:
                        # Convert dict to RTCIceCandidate object
                        candidate_data = message["candidate"]
                        
                        # Create RTCIceCandidate from the candidate data
                        ice_candidate = RTCIceCandidate(
                            candidate=candidate_data.get("candidate", ""),
                            sdpMid=candidate_data.get("sdpMid"),
                            sdpMLineIndex=candidate_data.get("sdpMLineIndex")
                        )
                        
                        await pc.addIceCandidate(ice_candidate)
                        logger.info(f"Successfully added ICE candidate for client {client_id}")
                    except Exception as e:
                        logger.error(f"Failed to add ICE candidate: {e}")
                        logger.error(f"Candidate data: {message['candidate']}")
                else:
                    logger.warning(f"Invalid ICE candidate message or no peer connection for client {client_id}")
                    
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(client_id)

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

@app.on_event("shutdown")
async def shutdown_event():
    """Handle application shutdown"""
    await manager.cleanup()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8080)
