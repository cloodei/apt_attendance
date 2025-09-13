import logging
import os
import asyncio
from datetime import datetime, time, timezone
import vstrack
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, RTCSessionDescription
import psycopg2
import psycopg2.extras
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="APT Attendance WebRTC Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

pcs: set[RTCPeerConnection] = set()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logging.warning("DATABASE_URL is not set. API endpoints requiring DB will raise at runtime.")

def get_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    conn = psycopg2.connect(DATABASE_URL)
    return conn

@app.post("/offer")
async def offer(request: Request):
    params = await request.json()
    raw_students = params.get("students_list", {}) or {}
    try:
        students_list: dict[int, str] = {int(k): str(v) for k, v in raw_students.items()}
    except Exception:
        students_list = {}
    session_id = params.get("session_id")
    try:
        session_id = int(session_id) if session_id is not None else None
    except Exception:
        session_id = None
    end_time_iso = params.get("end_time")
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await pc.close()
            pcs.discard(pc)
            print("Connection closed.")

    video_track = vstrack.FaceDetectionTrack(students_list, session_id=session_id, end_time_iso=end_time_iso)
    pc.addTrack(video_track)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return { "sdp": pc.localDescription.sdp, "type": pc.localDescription.type }

@app.get("/api/students/search", response_model=list[models.StudentOut])
def search_students(query: str = Query(..., min_length=1)):
    """Search students by id text or name (ILIKE). Returns at most 50 results."""
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            like = f"%{query}%"
            cur.execute(
                """
                SELECT id, name
                FROM "STUDENTS"
                WHERE name ILIKE %s OR CAST(id AS TEXT) LIKE %s
                ORDER BY id
                LIMIT 50
                """,
                (like, like),
            )
            rows = cur.fetchall()
            return [models.StudentOut(id=row["id"], name=row["name"]) for row in rows]
    finally:
        if 'conn' in locals():
            conn.close()


@app.post("/api/sessions/{session_id}/attendance/ping")
def attendance_ping(session_id: int, student_id: int, confidence: float):
    """
    Toggle attendance for a student in a given session.
    - If a row exists with in_time NOT NULL and out_time NULL, set out_time = now (checkout)
    - Else, insert new row with in_time = now (checkin)
    Returns { status: "checked_in" | "checked_out" }
    """
    now = datetime.now(timezone.utc)
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT 1 FROM \"SESSIONS\" WHERE id = %s", (session_id,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            # First check: row exists with in_time IS NULL (precreated or not yet checked in)
            cur.execute(
                """
                SELECT 1 FROM "ATTENDANCES"
                WHERE session_id = %s AND student_id = %s AND in_time IS NULL
                """,
                (session_id, student_id),
            )
            row = cur.fetchone()
            if row:
                cur.execute(
                    """
                    UPDATE "ATTENDANCES"
                    SET in_time = %s, confidence = GREATEST(COALESCE(confidence, 0), %s)
                    WHERE session_id = %s AND student_id = %s AND in_time IS NULL
                    """,
                    (now, confidence, session_id, student_id),
                )
                return {"status": "checked_in"}

            # Second: open checkin exists (in_time NOT NULL and out_time NULL) => checkout
            cur.execute(
                """
                SELECT 1 FROM "ATTENDANCES"
                WHERE session_id = %s AND student_id = %s AND in_time IS NOT NULL AND out_time IS NULL
                """,
                (session_id, student_id),
            )
            row = cur.fetchone()
            if row:
                cur.execute(
                    """
                    UPDATE "ATTENDANCES" SET out_time = %s
                    WHERE session_id = %s AND student_id = %s AND out_time IS NULL
                    """,
                    (now, session_id, student_id),
                )
                return {"status": "checked_out"}

            # Else: no row exists; insert a new open attendance
            cur.execute(
                """
                INSERT INTO "ATTENDANCES" (session_id, student_id, in_time, out_time, confidence)
                VALUES (%s, %s, %s, NULL, %s)
                """,
                (session_id, student_id, now, confidence),
            )
            return {"status": "checked_in"}
    finally:
        if 'conn' in locals():
            conn.close()


@app.post("/api/classes", response_model=models.ClassOut)
def create_class(payload: models.ClassCreate):
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT id FROM \"USERS\" WHERE account_id = %s", (payload.account_id,))
            user_row = cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=400, detail="User not found for provided account_id")
            user_id = int(user_row["id"])

            cur.execute(
                """
                INSERT INTO "CLASSES" (user_id, name, subject, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, name, subject, status
                """,
                (user_id, payload.name, payload.subject, payload.status),
            )
            cls = cur.fetchone()
            class_id = int(cls["id"])

            if payload.student_ids:
                psycopg2.extras.execute_batch(
                    cur,
                    "INSERT INTO \"STUDENT_LIST\" (student_id, class_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [(sid, class_id) for sid in payload.student_ids],
                )

            return models.ClassOut(
                id=class_id,
                user_id=cls["user_id"],
                name=cls["name"],
                subject=cls["subject"],
                status=cls["status"],
            )
    finally:
        if 'conn' in locals():
            conn.close()


@app.get("/api/classes", response_model=list[models.ClassOut])
def list_classes(account_id: str = Query(..., description="Clerk account_id of the teacher")):
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT c.id, c.user_id, c.name, c.subject, c.status
                FROM "CLASSES" c
                JOIN "USERS" u ON u.id = c.user_id
                WHERE u.account_id = %s
                ORDER BY c.id DESC
                """,
                (account_id,),
            )
            rows = cur.fetchall()
            return [models.ClassOut(id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"]) for r in rows]
    finally:
        if 'conn' in locals():
            conn.close()


@app.get("/api/classes/{class_id}", response_model=models.ClassOut)
def get_class(class_id: int):
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                "SELECT id, user_id, name, subject, status FROM \"CLASSES\" WHERE id = %s",
                (class_id,),
            )
            r = cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="Class not found")
            return models.ClassOut(id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"])
    finally:
        if 'conn' in locals():
            conn.close()


@app.get("/api/users/by-account/{account_id}", response_model=models.UserOut)
def get_user_by_account(account_id: str):
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                "SELECT id, account_id, name, faculty, academic_rank FROM \"USERS\" WHERE account_id = %s",
                (account_id,),
            )
            r = cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="User not found")
            return models.UserOut(
                id=r["id"], account_id=r["account_id"], name=r["name"], faculty=r["faculty"], academic_rank=r["academic_rank"]
            )
    finally:
        if 'conn' in locals():
            conn.close()


@app.get("/api/classes/{class_id}/students", response_model=list[models.StudentOut])
def get_class_students(class_id: int):
    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT s.id, s.name
                FROM "STUDENT_LIST" sl
                JOIN "STUDENTS" s ON s.id = sl.student_id
                WHERE sl.class_id = %s
                ORDER BY s.name
                """,
                (class_id,),
            )
            rows = cur.fetchall()
            return [models.StudentOut(id=r["id"], name=r["name"]) for r in rows]
    finally:
        if 'conn' in locals():
            conn.close()


@app.post("/api/classes/{class_id}/sessions")
def start_session(class_id: int, payload: models.SessionStartIn):
    now = datetime.now(timezone.utc)
    today_utc = now.date()
    end_dt = datetime.combine(today_utc, time(payload.hour, payload.minute, tzinfo=timezone.utc))
    if end_dt <= now:
        raise HTTPException(status_code=400, detail="End time must be later than current time")
    start_dt = now

    try:
        conn = get_conn()
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT 1 FROM \"CLASSES\" WHERE id = %s", (class_id,))
            exists = cur.fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail="Class not found")

            cur.execute(
                """
                INSERT INTO "SESSIONS" (class_id, start_time, end_time)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (class_id, start_dt, end_dt),
            )
            row = cur.fetchone()
            session_id = int(row["id"])

            # Pre-create attendance rows for roster with NULL times and confidence = 0.0
            cur.execute(
                "SELECT student_id FROM \"STUDENT_LIST\" WHERE class_id = %s",
                (class_id,),
            )
            roster_ids = [int(r[0]) for r in cur.fetchall()]
            if roster_ids:
                psycopg2.extras.execute_batch(
                    cur,
                    "INSERT INTO \"ATTENDANCES\" (session_id, student_id, in_time, out_time, confidence) VALUES (%s, %s, NULL, NULL, %s)",
                    [(session_id, sid, 0.0) for sid in roster_ids],
                )

            return {"id": session_id, "class_id": class_id, "start_time": start_dt.isoformat(), "end_time": end_dt.isoformat()}
    finally:
        if 'conn' in locals():
            conn.close()


@app.on_event("shutdown")
async def on_shutdown():
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8080)
