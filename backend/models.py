from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    contents = relationship("Content", back_populates="owner", cascade="all, delete-orphan")


class Content(Base):
    __tablename__ = "contents"
    # Add composite indexes for better query performance
    __table_args__ = (
        Index('idx_user_id', 'user_id'),
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_user_type', 'user_id', 'content_type'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # Added index
    content_type = Column(String, index=True)  # article, product, video, todo, note, quote, book
    title = Column(String, index=True)
    raw_data = Column(Text)
    source_url = Column(String, nullable=True)
    metadata_ = Column('metadata', JSON, nullable=True)  # Type-specific fields (renamed to avoid SQLAlchemy conflict)
    embedding_text = Column(Text)  # Text used for embedding
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    owner = relationship("User", back_populates="contents")
    embeddings = relationship("Embedding", backref="content", cascade="all, delete-orphan", uselist=False)


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("contents.id"), unique=True, index=True)  # Added index
    # Store embedding as JSON array since SQLite doesn't have array type
    vector = Column(JSON)
    model = Column(String, default="claude-3-5-sonnet")
    created_at = Column(DateTime, default=datetime.utcnow)
