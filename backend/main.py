import logging
import os
import asyncio
from datetime import datetime, time, timezone
import json
import vstrack
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.background import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, RTCSessionDescription
from starlette.responses import StreamingResponse
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
import models
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(instance: FastAPI):
    await pool.open()
    yield
    await pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

pcs: set[RTCPeerConnection] = set()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    logging.warning("DATABASE_URL is not set. API endpoints requiring DB will raise at runtime.")
    raise RuntimeError("DATABASE_URL is not set")
else:
    pool = AsyncConnectionPool(conninfo=DATABASE_URL, max_size=10, kwargs={"autocommit": False}, open=False, num_workers=5)

LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone.utc

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
async def attendance_ping(session_id: int, student_id: int):
    """
    Toggle attendance for a student in a given session.
    - If a row exists with in_time NOT NULL and out_time NULL, set out_time = now (checkout)
    - Else, insert new row with in_time = now (checkin)
    Returns { status: "checked_in" | "checked_out" }
    """
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT 1 FROM \"SESSIONS\" WHERE id = %s", (session_id,))
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            await cur.execute(
                """
                WITH updated_out AS (
                    UPDATE "ATTENDANCES"
                    SET out_time = NOW()
                    WHERE session_id = %s AND student_id = %s AND out_time IS NULL
                    RETURNING 1
                ),
                ins AS (
                    INSERT INTO "ATTENDANCES" (session_id, student_id, confidence, in_time, out_time)
                    SELECT %s, %s, %s, NOW(), NULL
                    WHERE NOT EXISTS (SELECT 1 FROM updated_out)
                    RETURNING 1
                )
                SELECT CASE WHEN EXISTS (SELECT 1 FROM updated_out) THEN 'checked_out' ELSE 'checked_in' END AS status;
                """,
                (session_id, student_id, session_id, student_id, 0.0),
            )
            res = await cur.fetchone()
            await conn.commit()
            return {"status": res["status"]}

@app.post("/api/classes", response_model=models.ClassOut)
async def create_class(payload: models.ClassCreate):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO "CLASSES" (user_id, name, subject, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (payload.user_id, payload.name, payload.subject, payload.status),
            )
            cls = await cur.fetchone()
            class_id = int(cls["id"])

            if payload.student_ids:
                await cur.executemany(
                    "INSERT INTO \"STUDENT_LIST\" (student_id, class_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [(sid, class_id) for sid in payload.student_ids],
                )

            await conn.commit()
            return models.ClassOut(id=class_id, user_id=payload.user_id, name=payload.name, subject=payload.subject, status=payload.status)

@app.get("/api/classes", response_model=list[models.ClassOut])
async def list_classes(user_id: int = Query(..., description="User ID of the teacher")):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT c.id, c.user_id, c.name, c.subject, c.status
                FROM "CLASSES" c
                JOIN "USERS" u ON u.id = c.user_id
                WHERE u.id = %s
                ORDER BY c.id DESC
                """,
                (user_id,),
            )
            rows = await cur.fetchall()
            return [models.ClassOut(id=r["id"], user_id=r["user_id"], name=r["name"], subject=r["subject"], status=r["status"]) for r in rows]


@app.get("/api/classes/with-counts", response_model=list[models.ClassSummaryOut])
async def list_classes_with_counts(account_id: str = Query(..., description="User ID of the teacher")):
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

@app.get("/api/users/{account_id}", response_model=models.UserOut)
async def get_user_by_account_id(account_id: str):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id, account_id, name, faculty, academic_rank FROM \"USERS\" WHERE account_id = %s",
                (account_id,),
            )
            r = await cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="User not found")
            return models.UserOut(id=r["id"], account_id=r["account_id"], name=r["name"], faculty=r["faculty"], academic_rank=r["academic_rank"])

@app.get("/api/classes/{class_id}/students", response_model=list[models.StudentOut])
async def get_class_students(class_id: int):
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
    now_local = datetime.now(LOCAL_TZ)
    end_local = datetime.combine(now_local.date(), time(payload.hour, payload.minute, tzinfo=LOCAL_TZ))
    now_utc = now_local.astimezone(timezone.utc)
    end_dt = end_local.astimezone(timezone.utc)
    if end_dt <= now_utc:
        raise HTTPException(status_code=400, detail="End time must be later than current time")
    start_dt = now_utc

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

            await conn.commit()
            return {"id": session_id, "class_id": class_id, "start_time": start_dt.isoformat(), "end_time": end_dt.isoformat()}


@app.get("/api/classes/{class_id}/sessions", response_model=list[models.SessionOut])
async def list_sessions_for_class(class_id: int):
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
            out = []
            for r in rows:
                st = r["start_time"].astimezone(LOCAL_TZ) if r["start_time"].tzinfo else r["start_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                et = r["end_time"].astimezone(LOCAL_TZ) if r["end_time"].tzinfo else r["end_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                out.append({"id": r["id"], "class_id": r["class_id"], "start_time": st.isoformat(), "end_time": et.isoformat()})
            return out


@app.get("/api/classes/{class_id}/sessions/with-stats")
async def list_sessions_with_stats(class_id: int):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT s.id, s.class_id, s.start_time, s.end_time,
                       (SELECT COUNT(*) FROM "ATTENDANCES" a WHERE a.session_id = s.id) AS present_count,
                       (SELECT COUNT(*) FROM "STUDENT_LIST" sl WHERE sl.class_id = s.class_id) AS total_students
                FROM "SESSIONS" s
                WHERE s.class_id = %s
                ORDER BY s.start_time DESC
                """,
                (class_id,),
            )
            rows = await cur.fetchall()
            out = []
            for r in rows:
                st = r["start_time"].astimezone(LOCAL_TZ) if r["start_time"].tzinfo else r["start_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                et = r["end_time"].astimezone(LOCAL_TZ) if r["end_time"].tzinfo else r["end_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                out.append({
                    "id": r["id"],
                    "class_id": r["class_id"],
                    "start_time": st.isoformat(),
                    "end_time": et.isoformat(),
                    "present_count": int(r["present_count"] or 0),
                    "total_students": int(r["total_students"] or 0),
                })
            return out


@app.post("/api/sessions/{session_id}/attendance/bulk")
async def attendance_bulk(session_id: int, payload: list[dict]):
    """
    Bulk insert attendance at the end of a session. Payload items: { student_id: int, in_time: ISO, out_time: ISO|null }
    Times are interpreted as ISO datetimes (with tz); if naive, assumed ICT and converted to UTC for storage.
    Ignores duplicates per (session_id, student_id).
    """
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT 1 FROM \"SESSIONS\" WHERE id = %s", (session_id,))
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            params = []
            for item in payload:
                sid = int(item["student_id"])
                it = item.get("in_time")
                ot = item.get("out_time")

                try:
                    tin = datetime.fromisoformat(it) if isinstance(it, str) else None
                except Exception:
                    tin = None

                try:
                    tout = datetime.fromisoformat(ot) if isinstance(ot, str) else None
                except Exception:
                    tout = None

                conf = item.get("confidence")
                try:
                    confv = float(conf) if conf is not None else 0.0
                except Exception:
                    confv = 0.0

                if tin is None:
                    continue
                if tin.tzinfo is None:
                    tin = tin.replace(tzinfo=LOCAL_TZ)
                tin = tin.astimezone(timezone.utc)

                if tout is not None:
                    if tout.tzinfo is None:
                        tout = tout.replace(tzinfo=LOCAL_TZ)
                    tout = tout.astimezone(timezone.utc)
                params.append((session_id, sid, confv, tin, tout, session_id, sid))

            if params:
                await cur.executemany(
                    """
                    INSERT INTO "ATTENDANCES" (session_id, student_id, confidence, in_time, out_time)
                    SELECT %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM "ATTENDANCES" a WHERE a.session_id = %s AND a.student_id = %s
                    )
                    """,
                    params,
                )
                await conn.commit()
    return {"inserted": len(params) if 'params' in locals() else 0}


@app.get("/api/sessions/{session_id}/attendance")
async def list_session_attendance(session_id: int):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT a.student_id, s.name, a.in_time, a.out_time, a.confidence AS avg_confidence
                FROM "ATTENDANCES" a
                JOIN "STUDENTS" s ON s.id = a.student_id
                WHERE a.session_id = %s
                ORDER BY a.in_time ASC
                """,
                (session_id,),
            )
            rows = await cur.fetchall()
            out = []
            for r in rows:
                it = r["in_time"].astimezone(LOCAL_TZ) if r["in_time"].tzinfo else r["in_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                ot = None
                if r["out_time"] is not None:
                    ot = r["out_time"].astimezone(LOCAL_TZ) if r["out_time"].tzinfo else r["out_time"].replace(tzinfo=timezone.utc).astimezone(LOCAL_TZ)
                out.append({
                    "student_id": r["student_id"],
                    "name": r["name"],
                    "in_time": it.isoformat(),
                    "out_time": ot.isoformat() if ot else None,
                    "avg_confidence": r.get("avg_confidence"),
                })
            return out


session_event_subs: dict[int, set[asyncio.Queue]] = {}

async def publish_session_event(session_id: int, event: dict):
    subs = session_event_subs.get(session_id)
    if not subs:
        return
    for q in list(subs):
        try:
            await q.put(event)
        except Exception:
            pass


@app.get("/api/sessions/{session_id}/events")
async def session_events(session_id: int):
    queue: asyncio.Queue = asyncio.Queue()
    session_event_subs.setdefault(session_id, set()).add(queue)

    async def event_gen():
        try:
            while True:
                evt = await queue.get()
                yield f"data: {json.dumps(evt)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            subs = session_event_subs.get(session_id)
            if subs and queue in subs:
                subs.discard(queue)

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@app.post("/api/sessions/{session_id}/events/notify")
async def notify_session_event(session_id: int, payload: dict):
    evt = {
        "session_id": session_id,
        "student_id": payload.get("student_id"),
        "name": payload.get("name"),
        "action": payload.get("action"),
        "time": payload.get("time") or datetime.now(LOCAL_TZ).isoformat(),
    }
    await publish_session_event(session_id, evt)
    return {"ok": True}


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
