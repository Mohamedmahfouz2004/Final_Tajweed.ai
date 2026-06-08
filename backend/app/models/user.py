"""
User & Token Pydantic models + MongoDB collection helpers.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ── Enums ──

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class TokenType(str, Enum):
    REFRESH = "refresh"
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"


# ── Request / Response Schemas ──

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_verified: bool = False


class AuthResponse(BaseModel):
    accessToken: str
    user: UserResponse


# ── MongoDB Document Shapes ──

class UserDocument(BaseModel):
    """Shape of a User document in MongoDB."""
    name: str
    email: str
    password: str  # hashed
    role: str = "user"
    is_verified: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class TokenDocument(BaseModel):
    """Shape of a Token document in MongoDB."""
    user: str  # ObjectId as string
    token: str
    type: TokenType
    expires_at: datetime
    revoked: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
