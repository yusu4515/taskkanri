import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not (2 <= len(v) <= 30):
            raise ValueError("ユーザー名は2〜30文字で入力してください")
        if not re.match(r"^[a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+$", v):
            raise ValueError("ユーザー名に使用できない文字が含まれています")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上で入力してください")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("パスワードには英字を1文字以上含めてください")
        if not re.search(r"\d", v):
            raise ValueError("パスワードには数字を1文字以上含めてください")
        return v


class UserLogin(BaseModel):
    identifier: str  # メールアドレス or ユーザー名
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上で入力してください")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("パスワードには英字を1文字以上含めてください")
        if not re.search(r"\d", v):
            raise ValueError("パスワードには数字を1文字以上含めてください")
        return v
