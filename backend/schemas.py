from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContentCreate(BaseModel):
    content_type: str
    title: str
    raw_data: str
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContentResponse(BaseModel):
    id: int
    user_id: int
    content_type: str
    title: str
    raw_data: str
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias='metadata_')
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True  # Allow both metadata and metadata_ names


class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 20
    content_type: Optional[str] = None


class SearchResult(BaseModel):
    content: ContentResponse
    similarity: float
