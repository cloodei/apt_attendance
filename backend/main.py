import logging
import os
import asyncio
from datetime import datetime, time, timezone
import vstrack
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.background import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, RTCSessionDescription
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
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

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logging.warning("DATABASE_URL is not set. API endpoints requiring DB will raise at runtime.")

pool = AsyncConnectionPool(conninfo=DATABASE_URL, max_size=10, kwargs={"autocommit": False})

# @app.on_event("startup")
# async def on_startup():
#     # Ensure pool is initialized
#     global pool
#     if DATABASE_URL and pool is None:
#         pool = AsyncConnectionPool(conninfo=DATABASE_URL, min_size=1, max_size=10, kwargs={"autocommit": False})

@app.post("/offer")
async def offer(request: Request):
    params = await request.json()
    raw_students = params.get("students_list", {})
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
async def search_students(query: str = Query(..., min_length=1)):
    """Search students by id text or name (ILIKE). Returns at most 50 results."""
    like = f"%{query}%"
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT id, name
                FROM "STUDENTS"
                WHERE name ILIKE %s OR CAST(id AS TEXT) LIKE %s
                ORDER BY id
                LIMIT 50
                """,
                (like, like),
            )
            rows = await cur.fetchall()
            return [models.StudentOut(id=row["id"], name=row["name"]) for row in rows]

@app.post("/api/sessions/{session_id}/attendance/ping")
async def attendance_ping(session_id: int, student_id: int, confidence: float):
    """
    Toggle attendance for a student in a given session.
    - If a row exists with in_time NOT NULL and out_time NULL, set out_time = now (checkout)
    - Else, insert new row with in_time = now (checkin)
    Returns { status: "checked_in" | "checked_out" }
    """
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            # Ensure session exists
            await cur.execute("SELECT 1 FROM \"SESSIONS\" WHERE id = %s", (session_id,))
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            # Single atomic operation: try set in_time if NULL, else set out_time if open, else insert a new row.
            await cur.execute(
                """
                WITH updated_in AS (
                    UPDATE "ATTENDANCES"
                    SET in_time = COALESCE(in_time, NOW()),
                        confidence = GREATEST(COALESCE(confidence, 0), %s)
                    WHERE session_id = %s AND student_id = %s AND in_time IS NULL
                    RETURNING 1
                ),
                updated_out AS (
                    UPDATE "ATTENDANCES"
                    SET out_time = NOW()
                    WHERE session_id = %s AND student_id = %s
                      AND in_time IS NOT NULL AND out_time IS NULL
                      AND NOT EXISTS (SELECT 1 FROM updated_in)
                    RETURNING 1
                ),
                ins AS (
                    INSERT INTO "ATTENDANCES" (session_id, student_id, in_time, out_time, confidence)
                    SELECT %s, %s, NOW(), NULL, %s
                    WHERE NOT EXISTS (SELECT 1 FROM updated_in)
                      AND NOT EXISTS (SELECT 1 FROM updated_out)
                    RETURNING 1
                )
                SELECT CASE
                    WHEN EXISTS (SELECT 1 FROM updated_out) THEN 'checked_out'
                    ELSE 'checked_in'
                END AS status;
                """,
                (confidence, session_id, student_id, session_id, student_id, session_id, student_id, confidence),
            )
            res = await cur.fetchone()
            await conn.commit()
            return {"status": res["status"]}

@app.post("/api/classes", response_model=models.ClassOut)
async def create_class(payload: models.ClassCreate):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT id FROM \"USERS\" WHERE account_id = %s", (payload.account_id,))
            user_row = await cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=400, detail="User not found for provided account_id")
            user_id = int(user_row["id"])

            await cur.execute(
                """
                INSERT INTO "CLASSES" (user_id, name, subject, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, name, subject, status
                """, # return only ID here 
                (user_id, payload.name, payload.subject, payload.status),
            )
            cls = await cur.fetchone()
            class_id = int(cls["id"])

            if payload.student_ids:
                await cur.executemany(
                    "INSERT INTO \"STUDENT_LIST\" (student_id, class_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [(sid, class_id) for sid in payload.student_ids],
                )

            await conn.commit()
            return models.ClassOut(
                id=class_id,
                user_id=cls["user_id"],
                name=cls["name"],
                subject=cls["subject"],
                status=cls["status"],
            )

@app.get("/api/classes", response_model=list[models.ClassOut])
async def list_classes(account_id: str = Query(..., description="Clerk account_id of the teacher")):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT c.id, c.user_id, c.name, c.subject, c.status
                FROM "CLASSES" c
                JOIN "USERS" u ON u.id = c.user_id
                WHERE u.account_id = %s
                ORDER BY c.id DESC
                """,
                (account_id,),
            )
            rows = await cur.fetchall()
            return [models.ClassOut(id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"]) for r in rows]


@app.get("/api/classes/with-counts", response_model=list[models.ClassSummaryOut])
async def list_classes_with_counts(account_id: str = Query(..., description="Clerk account_id of the teacher")):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT c.id, c.user_id, c.name, c.subject, c.status,
                       COALESCE(sl.cnt, 0) AS roster_count,
                       COALESCE(se.cnt, 0) AS sessions_count
                FROM "CLASSES" c
                JOIN "USERS" u ON u.id = c.user_id AND u.account_id = %s
                LEFT JOIN (
                    SELECT class_id, COUNT(*) AS cnt FROM "STUDENT_LIST" GROUP BY class_id
                ) sl ON sl.class_id = c.id
                LEFT JOIN (
                    SELECT class_id, COUNT(*) AS cnt FROM "SESSIONS" GROUP BY class_id
                ) se ON se.class_id = c.id
                ORDER BY c.id DESC
                """,
                (account_id,),
            )
            rows = await cur.fetchall()
            return [
                models.ClassSummaryOut(
                    id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"],
                    roster_count=r["roster_count"], sessions_count=r["sessions_count"]
                ) for r in rows
            ]

@app.get("/api/classes/{class_id}", response_model=models.ClassOut)
async def get_class(class_id: int):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id, user_id, name, subject, status FROM \"CLASSES\" WHERE id = %s",
                (class_id,),
            )
            r = await cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="Class not found")
            return models.ClassOut(id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"])

@app.get("/api/users/by-account/{account_id}", response_model=models.UserOut)
async def get_user_by_account(account_id: str):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id, account_id, name, faculty, academic_rank FROM \"USERS\" WHERE account_id = %s",
                (account_id,),
            )
            r = await cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="User not found")
            return models.UserOut(
                id=r["id"], account_id=r["account_id"], name=r["name"], faculty=r["faculty"], academic_rank=r["academic_rank"]
            )

@app.get("/api/classes/{class_id}/students", response_model=list[models.StudentOut])
async def get_class_students(class_id: int):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT s.id, s.name
                FROM "STUDENT_LIST" sl
                JOIN "STUDENTS" s ON s.id = sl.student_id
                WHERE sl.class_id = %s
                ORDER BY s.name
                """,
                (class_id,),
            )
            rows = await cur.fetchall()
            return [models.StudentOut(id=r["id"], name=r["name"]) for r in rows]

@app.post("/api/classes/{class_id}/sessions")
async def start_session(class_id: int, payload: models.SessionStartIn, background: BackgroundTasks):
    now = datetime.now(timezone.utc)
    today_utc = now.date()
    end_dt = datetime.combine(today_utc, time(payload.hour, payload.minute, tzinfo=timezone.utc))
    if end_dt <= now:
        raise HTTPException(status_code=400, detail="End time must be later than current time")
    start_dt = now

    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT 1 FROM \"CLASSES\" WHERE id = %s", (class_id,))
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Class not found")

            await cur.execute(
                """
                INSERT INTO "SESSIONS" (class_id, start_time, end_time)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (class_id, start_dt, end_dt),
            )
            row = await cur.fetchone()
            session_id = int(row["id"])

            # Commit the session creation promptly
            await conn.commit()

            # Fire-and-forget: pre-create attendance rows after responding
            background.add_task(precreate_attendance_rows, session_id, class_id)

            return {"id": session_id, "class_id": class_id, "start_time": start_dt.isoformat(), "end_time": end_dt.isoformat()}


async def precreate_attendance_rows(session_id: int, class_id: int):
    if pool is None:
        return
    try:
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    INSERT INTO "ATTENDANCES" (session_id, student_id, in_time, out_time, confidence)
                    SELECT %s, sl.student_id, NULL, NULL, 0.0
                    FROM "STUDENT_LIST" sl
                    WHERE sl.class_id = %s
                    ON CONFLICT DO NOTHING
                    """,
                    (session_id, class_id),
                )
                await conn.commit()
    except Exception:
        pass


@app.get("/api/classes/{class_id}/sessions", response_model=list[models.SessionOut])
async def list_sessions_for_class(class_id: int):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT id, class_id, start_time, end_time
                FROM "SESSIONS"
                WHERE class_id = %s
                ORDER BY start_time DESC
                """,
                (class_id,),
            )
            rows = await cur.fetchall()
            return [
                {"id": r["id"], "class_id": r["class_id"], "start_time": r["start_time"].isoformat(), "end_time": r["end_time"].isoformat()}  # type: ignore
                for r in rows
            ]


@app.on_event("shutdown")
async def on_shutdown():
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()
    global pool
    if pool is not None:
        await pool.close()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8080)
