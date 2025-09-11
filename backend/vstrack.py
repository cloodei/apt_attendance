import asyncio
import logging
import time
import cv2
import numpy as np
from PIL import Image
from aiortc import VideoStreamTrack
from av import VideoFrame
import cv2
import numpy as np
from facenet_pytorch import MTCNN

IP_WEBCAM_URL = "http://10.2.88.228:8080/video"

mtcnn = MTCNN(keep_all=True)

def detect_faces(frame):
    """
    Detects faces in a given frame, draws bounding boxes, and returns the frame.
    This is a blocking, CPU-bound function.
    """
    # Resize for faster processing and convert to PIL Image
    frame_resized = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB))

    # Detect faces
    boxes, probs = mtcnn.detect(img)
    
    # Draw bounding boxes on the resized frame
    if boxes is not None:
        for box, prob in zip(boxes, probs):
            if prob > 0.8: # Increased threshold for better accuracy
                x1, y1, x2, y2 = [int(b) for b in box]
                cv2.rectangle(frame_resized, (x1, y1), (x2, y2), (0, 255, 0), 2)

    return frame_resized

class IPWebcamTrack(VideoStreamTrack):
    """
    A video stream track that captures frames from an IP Webcam URL using OpenCV.
    This version includes error handling and reconnection logic.
    """
    def __init__(self):
        super().__init__()
        self.cap = None
        self.reconnect_attempts = 5
        self.last_frame_time = time.time()
        self.connect()

    def connect(self):
        print("Attempting to connect to IP Webcam stream...")
        self.cap = cv2.VideoCapture(IP_WEBCAM_URL, cv2.CAP_FFMPEG)

        if not self.cap.isOpened():
            logging.error(f"Could not open video stream from IP Webcam: {IP_WEBCAM_URL}")
            self.cap = None
        else:
            print("Successfully connected to IP Webcam stream.")

    async def recv(self):
        pts, time_base = await self.next_timestamp()

        if self.cap is None:
            self.connect()
            black_frame_img = np.zeros((480, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(black_frame_img, format="rgb24")
            video_frame.pts = pts
            video_frame.time_base = time_base
            await asyncio.sleep(1)
            return video_frame

        ret, frame = self.cap.read()

        if not ret:
            logging.warning("Could not read frame, potential connection loss.")
            self.cap.release()
            self.cap = None
            # Return a black frame to keep the stream alive
            black_frame_img = np.zeros((480, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(black_frame_img, format="rgb24")
            video_frame.pts = pts
            video_frame.time_base = time_base
            return video_frame

        # Run face detection in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        processed_frame = await loop.run_in_executor(None, detect_faces, frame)

        # Create a VideoFrame from the processed frame
        video_frame = VideoFrame.from_ndarray(processed_frame, format="bgr24")
        
        # Reformat to yuv420p for better browser compatibility
        video_frame = video_frame.reformat(format="yuv420p")
        video_frame.pts = pts
        video_frame.time_base = time_base

        return video_frame

    def __del__(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
