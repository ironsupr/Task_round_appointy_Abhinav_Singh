from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta, datetime
from typing import List
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import models
import schemas
from database import engine, get_db
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ai_service import (
    get_embedding_from_text,
    cosine_similarity,
    parse_search_query,
    rank_results_with_claude
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Synapse API")

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - Fixed for security
# In production, update these origins to your actual domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3000",  # Alternative localhost
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Only needed methods
    allow_headers=["Content-Type", "Authorization"],  # Only needed headers
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Security headers to prevent common attacks
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    return response


@app.get("/")
def read_root():
    return {"message": "Synapse API is running", "version": "1.0.0"}


@app.post("/api/auth/register", response_model=schemas.Token)
@limiter.limit("3/minute")  # Only 3 registrations per minute per IP
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()

    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(
        data={"sub": new_user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=schemas.Token)
@limiter.limit("5/minute")  # Only 5 login attempts per minute per IP
def login(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": db_user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/api/content", response_model=schemas.ContentResponse)
def create_content(
    content: schemas.ContentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create content
    new_content = models.Content(
        user_id=current_user.id,
        content_type=content.content_type,
        title=content.title,
        raw_data=content.raw_data,
        source_url=content.source_url,
        metadata_=content.metadata,  # Schema has metadata, model has metadata_
        embedding_text=f"{content.title} {content.raw_data}"
    )

    db.add(new_content)
    db.commit()
    db.refresh(new_content)

    # Generate and store embedding
    try:
        embedding_vector = get_embedding_from_text(new_content.embedding_text)
        new_embedding = models.Embedding(
            content_id=new_content.id,
            vector=embedding_vector
        )
        db.add(new_embedding)
        db.commit()
    except Exception as e:
        print(f"Error generating embedding: {e}")

    return new_content


@app.get("/api/content", response_model=List[schemas.ContentResponse])
def get_all_content(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    content_type: str = None
):
    query = db.query(models.Content).filter(models.Content.user_id == current_user.id)

    if content_type:
        query = query.filter(models.Content.content_type == content_type)

    contents = query.order_by(models.Content.created_at.desc()).offset(skip).limit(limit).all()
    return contents


@app.get("/api/content/{content_id}", response_model=schemas.ContentResponse)
def get_content(
    content_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = db.query(models.Content).filter(
        models.Content.id == content_id,
        models.Content.user_id == current_user.id
    ).first()

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    return content


@app.delete("/api/content/{content_id}")
def delete_content(
    content_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = db.query(models.Content).filter(
        models.Content.id == content_id,
        models.Content.user_id == current_user.id
    ).first()

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    db.delete(content)
    db.commit()

    return {"message": "Content deleted successfully"}


@app.post("/api/search", response_model=List[schemas.SearchResult])
def search_content(
    search: schemas.SearchQuery,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all user's content with embeddings (fixes N+1 query problem)
    query = (db.query(models.Content)
             .filter(models.Content.user_id == current_user.id)
             .options(joinedload(models.Content.embeddings)))

    # Apply content type filter if specified
    if search.content_type:
        query = query.filter(models.Content.content_type == search.content_type)

    contents = query.all()

    if not contents:
        return []

    # Parse query with Claude to extract filters
    contents_data = [
        {
            "id": c.id,
            "title": c.title,
            "content_type": c.content_type,
            "raw_data": c.raw_data,
            "metadata": c.metadata,
            "created_at": c.created_at.isoformat()
        }
        for c in contents
    ]

    parsed_query = parse_search_query(search.query, contents_data)

    # Filter by content type from parsed query
    if parsed_query.get("content_type") and not search.content_type:
        contents = [c for c in contents if c.content_type == parsed_query["content_type"]]

    # Filter by time
    if parsed_query.get("time_filter"):
        now = datetime.utcnow()
        time_filter = parsed_query["time_filter"]

        if time_filter == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_filter == "yesterday":
            start_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_filter == "last_week":
            start_date = now - timedelta(days=7)
        elif time_filter == "last_month":
            start_date = now - timedelta(days=30)
        else:
            start_date = None

        if start_date:
            contents = [c for c in contents if c.created_at >= start_date]

    # Generate query embedding
    query_text = parsed_query.get("search_terms", search.query)
    query_embedding = get_embedding_from_text(query_text)

    # Calculate similarities
    results = []
    for content in contents:
        # Use preloaded embedding (no additional query needed - fixes N+1 problem)
        embedding_record = content.embeddings  # Already loaded via joinedload

        if embedding_record:
            similarity = cosine_similarity(query_embedding, embedding_record.vector)

            # Apply price filter if present
            if parsed_query.get("price_range") and content.metadata_:
                price = content.metadata_.get("price")
                if price:
                    try:
                        price_val = float(price)
                        min_price = parsed_query["price_range"].get("min", 0)
                        max_price = parsed_query["price_range"].get("max", float('inf'))

                        if not (min_price <= price_val <= max_price):
                            continue
                    except (ValueError, TypeError):
                        pass

            results.append({
                "content": content,
                "similarity": similarity
            })

    # Sort by similarity
    results.sort(key=lambda x: x["similarity"], reverse=True)

    # Use Claude to re-rank top results for better relevance
    if len(results) > 10:
        # Prepare for re-ranking
        results_for_ranking = [
            {
                "id": r["content"].id,
                "title": r["content"].title,
                "content_type": r["content"].content_type,
                "raw_data": r["content"].raw_data,
                "metadata": r["content"].metadata,
                "similarity": r["similarity"]
            }
            for r in results[:50]
        ]

        ranked_results = rank_results_with_claude(search.query, results_for_ranking, search.limit)

        # Map back to results
        final_results = []
        for ranked in ranked_results:
            for r in results:
                if r["content"].id == ranked["id"]:
                    final_results.append(r)
                    break

        results = final_results
    else:
        results = results[:search.limit]

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
