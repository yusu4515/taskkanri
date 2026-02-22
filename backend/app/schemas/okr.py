from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class KeyResultCreate(BaseModel):
    title: str
    target_value: float = 100.0
    current_value: float = 0.0
    unit: str = "%"


class KeyResultUpdate(BaseModel):
    title: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None


class KeyResultResponse(BaseModel):
    id: int
    objective_id: int
    title: str
    target_value: float
    current_value: float
    unit: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ObjectiveCreate(BaseModel):
    title: str
    description: Optional[str] = None
    quarter: str  # e.g., "2025Q1"
    color: str = "blue"


class ObjectiveUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quarter: Optional[str] = None
    color: Optional[str] = None


class ObjectiveResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    quarter: str
    color: str
    key_results: list[KeyResultResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
