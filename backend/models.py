from pydantic import BaseModel, Field

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
