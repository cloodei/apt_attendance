# APT Attendance WebRTC Camera Setup

This guide explains how to set up and run the WebRTC camera streaming functionality for the APT Attendance system.

## Overview

The system consists of:
- **Backend Server**: Python FastAPI server with OpenCV and aiortc for camera capture and WebRTC streaming
- **Frontend Client**: React/Next.js client that receives and displays the camera feed via WebRTC
- **Demo Page**: Side-by-side comparison of local camera vs server stream

## Prerequisites

- Python 3.12+
- Node.js 18+ (for frontend)
- A working camera (webcam or USB camera)
- Modern web browser with WebRTC support

## Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   # Using uv (recommended)
   uv sync
   
   # Or using pip
   pip install -e .
   ```

3. **Run the server:**
   ```bash
   # Using the provided script
   python run_server.py
   
   # Or directly with uvicorn
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Verify the server is running:**
   - Open http://localhost:8000 in your browser
   - You should see "APT Attendance WebRTC Server" page
   - Check http://localhost:8000/api/status for server status

## Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Run the development server:**
   ```bash
   bun dev
   # or
   npm run dev
   ```

4. **Open the demo page:**
   - Navigate to http://localhost:3000/demo
   - You should see two camera feeds side by side

## Usage

### Testing the System

1. **Start the backend server** (if not already running)
2. **Open the demo page** at http://localhost:3000/demo
3. **Local Camera**: Should start automatically (requires camera permissions)
4. **Server Stream**: Click "Connect to Server" to start the WebRTC connection

### API Endpoints

- `GET /` - Server status page
- `GET /api/status` - Server status JSON
- `POST /api/camera/start` - Start camera capture
- `POST /api/camera/stop` - Stop camera capture
- `WS /ws/{client_id}` - WebRTC signaling endpoint

### WebRTC Client Usage

```tsx
import { WebRTCClient } from '../components/webrtc-client';

<WebRTCClient
  label="Server Feed"
  isRecognizing={false}
  facesDetected={0}
  confidence={0}
  serverUrl="ws://localhost:8000"
  className="w-full h-64"
/>
```

## Troubleshooting

### Common Issues

1. **Camera not detected:**
   - Check if camera is connected and not used by other applications
   - Verify camera permissions in your browser
   - Try different camera indices in the backend code

2. **WebRTC connection fails:**
   - Ensure backend server is running on port 8000
   - Check browser console for WebRTC errors
   - Verify STUN servers are accessible

3. **Video not displaying:**
   - Check if camera is being captured (look at server logs)
   - Verify WebRTC connection is established
   - Check browser compatibility

### Debug Mode

Enable debug logging in the backend:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Camera Configuration

To change camera settings, modify the `_camera_loop` method in `backend/main.py`:

```python
# Set camera properties
self.camera_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)   # Width
self.camera_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)   # Height
self.camera_cap.set(cv2.CAP_PROP_FPS, 30)             # FPS
```

## Architecture

```
┌─────────────────┐    WebRTC     ┌─────────────────┐
│   Frontend      │◄─────────────►│   Backend       │
│   (React)       │   WebSocket   │   (FastAPI)     │
│                 │               │                 │
│ - WebRTCClient  │               │ - Camera Capture│
│ - FaceCamera    │               │ - VideoStream   │
│ - Demo Page     │               │ - WebRTC Server │
└─────────────────┘               └─────────────────┘
```

## Security Notes

- The current setup allows all origins (`allow_origins=["*"]`)
- For production, configure proper CORS settings
- Consider adding authentication for WebRTC connections
- Use HTTPS/WSS for production deployments

## Performance Considerations

- Camera capture runs in a separate thread to avoid blocking
- Video frames are shared between all connected clients
- Consider frame rate limits for multiple clients
- Monitor memory usage with long-running sessions
