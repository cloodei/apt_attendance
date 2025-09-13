import asyncio
import cv2
import joblib
import numpy as np
import torch
from PIL import Image
from aiortc import VideoStreamTrack
from av import VideoFrame
from facenet_pytorch import MTCNN, InceptionResnetV1

IP_WEBCAM_URL = "http://10.2.88.228:8080/video"

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device="cpu")
resnet = InceptionResnetV1(pretrained='vggface2').eval().to("cpu")
classifier = joblib.load("models/svm_model.pkl")

MSV_TO_NAME = {
    "1": "Nguyen_Duy_Hoang",
    "2": "Nguyen_Duc_Phong",
    "3": "Le_Duc_Nguyen",
    "4": "Nguyen_Phong_Hai",
    "5": "Nguyen_Phu_Nguyen",
    "6": "Nguyen_Van_Minh",
    "7": "Nguyen_Van_Tuan",
    "8": "Nguyen_Viet_Quoc_An",
    "9": "Nguyen_The_Truong",
    "10": "Nguyen_Thi_Cam_Ly",
    "11": "Nguyen_Thi_Hong_Mai",
    "12": "Nguyen_Ha_Phuong_Uyen",
    "13": "Nguyen_Thi_Phuong_Thao",
    "14": "Mai_Thanh_Thu",
}

def detect_faces(frame: cv2.typing.MatLike):
    """
    Detects faces in a given frame, draws bounding boxes, and returns the frame.
    This is a blocking, CPU-bound function.
    """
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    boxes, probs = mtcnn.detect(img)

    if boxes is not None:
        valid_indices = [i for i, p in enumerate(probs) if p is not None and p >= 0.9]
        if not valid_indices:
            return frame

        boxes = boxes[valid_indices]
        face_tensors = mtcnn(img)
        if face_tensors is None:
            return frame

        if not isinstance(face_tensors, list):
            face_tensors = [face_tensors[i] for i in valid_indices]
        else:
            face_tensors = [face_tensors[i] for i in valid_indices]

        if not face_tensors:
            return frame

        face_tensors_stacked = torch.stack(face_tensors).to(device)
        face_embeddings = resnet(face_tensors_stacked).detach().cpu().numpy()

        preds = classifier.predict(face_embeddings)
        names = [MSV_TO_NAME.get(str(p), "Unknown") for p in preds]
        h, w, _ = frame.shape

        for box, name in zip(boxes, names):
            x1, y1, x2, y2 = [int(b) for b in box]
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            if x2 <= x1 or y2 <= y1:
                continue

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

    return frame


class FaceDetectionTrack(VideoStreamTrack):
    """
    VideoStreamTrack that performs face detection every `process_interval` frames.
    Intermediate frames are relayed unmodified to keep FPS high.
    """
    def __init__(self):
        super().__init__()
        self.cap = None
        self.reconnect_attempts = 5
        self.connect()

    def connect(self):
        print("Attempting to connect to IP Webcam stream...")
        self.cap = cv2.VideoCapture(IP_WEBCAM_URL, cv2.CAP_FFMPEG)

        if not self.cap.isOpened():
            print(f"Could not open video stream from IP Webcam: {IP_WEBCAM_URL}")
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
            print("Could not read frame, potential connection loss.")
            self.cap.release()
            self.cap = None
            black_frame_img = np.zeros((480, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(black_frame_img, format="rgb24")
            video_frame.pts = pts
            video_frame.time_base = time_base
            return video_frame

        loop = asyncio.get_event_loop()
        processed_frame = await loop.run_in_executor(None, detect_faces, frame)

        video_frame = VideoFrame.from_ndarray(processed_frame, format="bgr24")
        video_frame = video_frame.reformat(format="yuv420p")
        video_frame.pts = pts
        video_frame.time_base = time_base

        return video_frame

    def __del__(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
