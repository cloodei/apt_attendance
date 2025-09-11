import asyncio
import logging
import time
import cv2
import numpy as np
from aiortc import VideoStreamTrack
from av import VideoFrame

IP_WEBCAM_URL = "http://10.2.88.228:8080/video"

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

        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        # Resample the frame to a format that is more compatible with WebRTC
        # video_frame = video_frame.reformat(format="yuv420p")
        video_frame.pts = pts
        video_frame.time_base = time_base
        
        return video_frame

    def __del__(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
