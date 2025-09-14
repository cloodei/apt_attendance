from pydantic import BaseModel, Field
from datetime import datetime

class StudentOut(BaseModel):
    id: int
    name: str

class ClassCreate(BaseModel):
    account_id: str = Field(..., description="Clerk account_id of the teacher")
    name: str
    subject: str
    status: str = "active"
    student_ids: list[int] = []

class ClassOut(BaseModel):
    id: int
    user_id: int
    name: str
    subject: str
    status: str

class SessionStartIn(BaseModel):
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)

class UserOut(BaseModel):
    id: int
    account_id: str
    name: str
    faculty: str
    academic_rank: str

class ClassSummaryOut(BaseModel):
    id: int
    user_id: int
    name: str
    subject: str
    status: str
    roster_count: int
    sessions_count: int

class SessionOut(BaseModel):
    id: int
    class_id: int
    start_time: datetime
    end_time: datetime
