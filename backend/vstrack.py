import asyncio
from datetime import datetime, timezone, timedelta
import os
import requests
import faiss
from collections import deque
import cv2
import joblib
import numpy as np
import torch
from PIL import Image
from aiortc import VideoStreamTrack
from av import VideoFrame
from torchvision import transforms
from facenet_pytorch import MTCNN, InceptionResnetV1
from collections import deque, Counter

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

model = faiss.read_index("models/faiss_model/faiss_index.index")
y_train = joblib.load("models/faiss_model/faiss_labels.pkl")

preprocess = transforms.Compose([
    transforms.Resize((160, 160)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

prediction_queue = deque(maxlen=5)

IP_WEBCAM_URL = "http://10.2.88.228:8080/video"

# automatically infer local timezone
ICT = timezone(timedelta(hours=7))

def predict_one_faiss_k1(index, x):
    x = x.reshape(1, -1).astype('float32')
    D, I = index.search(x, 1)
    idx = I[0][0]
    dist = D[0][0]
    label = y_train[idx]
    similarity = 1 / (1 + dist)
    return label, similarity

def detect_faces(frame: cv2.typing.MatLike, students_list: dict[int, str]):
    """
    Detects faces in a given frame, draws bounding boxes, and returns the frame.
    This is a blocking, CPU-bound function.
    """
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    boxes, probs = mtcnn.detect(img)

    if boxes is not None:
        h, w, _ = frame.shape
        for box, prob in zip(boxes, probs):
            if prob is None or prob < 0.9:
                continue

            x1, y1, x2, y2 = [int(b) for b in box]
            x1 = max(0, x1); y1 = max(0, y1)
            x2 = min(w, x2); y2 = min(h, y2)

            if x2 <= x1 or y2 <= y1:
                continue

            face_img = frame[y1:y2, x1:x2]
            if face_img.size == 0:
                continue

            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            face_tensor = preprocess(face_pil).unsqueeze(0).to(device)

            face_embedding = resnet(face_tensor).detach().cpu().numpy()

            labels, similarity = predict_one_faiss_k1(model, face_embedding)

            if similarity < 0.65:
                name = "Unknown"
            else:
                name = students_list.get(labels, "Unknown")
                prediction_queue.append(labels)

            if len(prediction_queue) == 5:
                attendee_id = Counter(prediction_queue).most_common(1)[0][0]
                prediction_queue.clear()
                return frame, {"attendee_id": int(attendee_id), "confidence": similarity}

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

    return frame, None


class FaceDetectionTrack(VideoStreamTrack):
    """
    VideoStreamTrack that performs face detection every `process_interval` frames.
    Intermediate frames are relayed unmodified to keep FPS high.
    """
    def __init__(self, students_list: dict[int, str], session_id: int | None = None, end_time_iso: str | None = None):
        super().__init__()
        self.cap = None
        self.reconnect_attempts = 5
        self.students_list = students_list
        self.session_id = session_id
        self.attendance: dict[int, dict[str, object]] = {}
        self._bulk_sent = False
        self.end_time = None
        if end_time_iso:
            try:
                dt = datetime.fromisoformat(end_time_iso)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                self.end_time = dt.astimezone(timezone.utc)
            except Exception:
                self.end_time = None
        self.api_base = os.getenv("API_BASE_URL") or "http://localhost:8080"
        self.connect()

    def _record_event(self, student_id: int, confidence: float | None = None):
        if student_id not in self.students_list:
            return

        now_local = datetime.now()
        rec = self.attendance.get(student_id)
        if rec is None:
            self.attendance[student_id] = {
                "in_time": now_local,
                "out_time": None,
                "conf_sum": float(confidence) if (confidence is not None) else 0.0,
                "conf_count": 1 if (confidence is not None) else 0,
            }
            try:
                requests.post(
                    f"{self.api_base}/api/sessions/{self.session_id}/events/notify",
                    json={
                        "student_id": student_id,
                        "name": self.students_list.get(student_id),
                        "action": "in",
                        "time": now_local.isoformat(),
                        "confidence": confidence,
                    },
                    timeout=2,
                )
            except Exception:
                pass
        else:
            in_time = rec.get("in_time")
            try:
                if isinstance(in_time, datetime) and (now_local - in_time) < timedelta(seconds=30):
                    return
            except Exception:
                pass
            if confidence is not None:
                try:
                    rec["conf_sum"] = float(rec.get("conf_sum", 0.0)) + float(confidence)
                    rec["conf_count"] = int(rec.get("conf_count", 0)) + 1
                except Exception:
                    pass
            rec["out_time"] = now_local
            try:
                requests.post(
                    f"{self.api_base}/api/sessions/{self.session_id}/events/notify",
                    json={
                        "student_id": student_id,
                        "name": self.students_list.get(student_id),
                        "action": "out",
                        "time": now_local.isoformat(),
                        "confidence": confidence,
                    },
                    timeout=2,
                )
            except Exception:
                pass

    def _flush_bulk(self):
        if self._bulk_sent or not self.session_id or not self.attendance:
            return
        try:
            payload = []
            for sid, rec in self.attendance.items():
                tin = rec.get("in_time")
                tout = rec.get("out_time")
                conf_avg = None
                try:
                    cs = float(rec.get("conf_sum", 0.0))
                    cc = int(rec.get("conf_count", 0))
                    conf_avg = (cs / cc) if cc > 0 else None
                except Exception:
                    conf_avg = None
                payload.append({
                    "student_id": sid,
                    "in_time": tin.isoformat() if isinstance(tin, datetime) else None,
                    "out_time": tout.isoformat() if isinstance(tout, datetime) else None,
                    "confidence": conf_avg,
                })
            requests.post(
                f"{self.api_base}/api/sessions/{self.session_id}/attendance/bulk",
                json=payload,
                timeout=3,
            )
            self._bulk_sent = True
        except Exception:
            pass

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

        if self.end_time is not None and datetime.now(timezone.utc) >= self.end_time:
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None

            self._flush_bulk()
            black_frame_img = np.zeros((480, 640, 3), dtype=np.uint8)
            video_frame = VideoFrame.from_ndarray(black_frame_img, format="rgb24")
            video_frame.pts = pts
            video_frame.time_base = time_base
            await asyncio.sleep(0.2)
            return video_frame

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
        processed_frame, event = await loop.run_in_executor(None, detect_faces, frame, self.students_list)

        if event and self.session_id:
            conf = None
            try:
                conf = float(event.get("confidence")) if isinstance(event, dict) and event.get("confidence") is not None else None
            except Exception:
                conf = None
            self._record_event(int(event["attendee_id"]), conf)

        video_frame = VideoFrame.from_ndarray(processed_frame, format="bgr24")
        video_frame = video_frame.reformat(format="yuv420p")
        video_frame.pts = pts
        video_frame.time_base = time_base

        return video_frame

    def __del__(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
        self._flush_bulk()
