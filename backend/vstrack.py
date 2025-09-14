import requests_async as requests
import asyncio
import os
import cv2
import numpy as np
from av import VideoFrame
from aiortc import VideoStreamTrack
from datetime import datetime, timezone, timedelta
from detect import detect_faces

IP_WEBCAM_URL = "http://10.2.90.4:4747/video"

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
                asyncio.create_task(
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
                )
            except Exception:
                pass
        else:
            in_time = rec.get("in_time")
            try:
                if isinstance(in_time, datetime) and (now_local - in_time) < timedelta(seconds=60):
                    return
            except Exception:
                pass
            if confidence is not None:
                try:
                    rec["conf_sum"] = float(rec.get("conf_sum", 0.0)) + float(confidence)
                    rec["conf_count"] = int(rec.get("conf_count", 0)) + 1
                except Exception:
                    pass
            out_time = rec.get("out_time")
            if out_time and (now_local - out_time) < timedelta(seconds=60):
                return

            rec["out_time"] = now_local
            try:
                asyncio.create_task(
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
            asyncio.create_task(
                requests.post(
                    f"{self.api_base}/api/sessions/{self.session_id}/attendance/bulk",
                    json=payload,
                    timeout=3,
                )
            )
            self._bulk_sent = True
        except Exception:
            pass

    def connect(self):
        print("Attempting to connect to IP Webcam stream...")
        self.cap = cv2.VideoCapture(IP_WEBCAM_URL)

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
