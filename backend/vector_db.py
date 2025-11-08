"""
Vector Database Service using Qdrant
Handles vector storage and similarity search with hybrid filtering
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from typing import List, Dict, Any, Optional
import logging
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Qdrant client (using in-memory mode for development)
# For production, use: QdrantClient(url="http://localhost:6333")
QDRANT_MODE = os.getenv("QDRANT_MODE", "memory")  # "memory" or "server"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

if QDRANT_MODE == "server":
    try:
        client = QdrantClient(url=QDRANT_URL)
        logger.info(f"Connected to Qdrant server at {QDRANT_URL}")
    except Exception as e:
        logger.warning(f"Failed to connect to Qdrant server: {e}. Falling back to in-memory mode.")
        client = QdrantClient(":memory:")
else:
    client = QdrantClient(":memory:")
    logger.info("Using Qdrant in-memory mode")

# Collection configuration
COLLECTION_NAME = "synapse_content"
TEXT_VECTOR_SIZE = 384  # all-MiniLM-L6-v2 dimension
IMAGE_VECTOR_SIZE = 512  # CLIP ViT-B/32 dimension


def initialize_collection():
    """Initialize Qdrant collection with multiple vector configurations"""
    try:
        # Check if collection exists
        collections = client.get_collections().collections
        collection_exists = any(col.name == COLLECTION_NAME for col in collections)

        if not collection_exists:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config={
                    "text": VectorParams(size=TEXT_VECTOR_SIZE, distance=Distance.COSINE),
                    "image": VectorParams(size=IMAGE_VECTOR_SIZE, distance=Distance.COSINE),
                }
            )
            logger.info(f"Created collection: {COLLECTION_NAME}")
        else:
            logger.info(f"Collection {COLLECTION_NAME} already exists")

        return True
    except Exception as e:
        logger.error(f"Error initializing collection: {e}")
        return False


def add_content_vector(
    content_id: int,
    user_id: int,
    text_vector: List[float],
    image_vector: Optional[List[float]] = None,
    content_type: str = "article",
    metadata: Dict[str, Any] = None
) -> bool:
    """
    Add or update content vector in Qdrant

    Args:
        content_id: Unique content ID
        user_id: User ID for filtering
        text_vector: Text embedding vector
        image_vector: Optional image embedding vector
        content_type: Type of content (article, video, image, etc.)
        metadata: Additional metadata for filtering
    """
    try:
        # Prepare vectors
        vectors = {"text": text_vector}
        if image_vector:
            vectors["image"] = image_vector

        # Prepare payload (metadata for filtering)
        payload = {
            "content_id": content_id,
            "user_id": user_id,
            "content_type": content_type,
            "created_at": datetime.utcnow().isoformat(),
            **(metadata or {})
        }

        # Upsert point
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=content_id,
                    vector=vectors,
                    payload=payload
                )
            ]
        )

        logger.info(f"Added vector for content_id: {content_id}")
        return True

    except Exception as e:
        logger.error(f"Error adding vector for content_id {content_id}: {e}")
        return False


def search_similar_content(
    query_vector: List[float],
    user_id: int,
    vector_name: str = "text",
    content_type: Optional[str] = None,
    limit: int = 20,
    score_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Search for similar content using vector similarity

    Args:
        query_vector: Query embedding vector
        user_id: User ID for filtering
        vector_name: Which vector to search ("text" or "image")
        content_type: Optional content type filter
        limit: Maximum number of results
        score_threshold: Minimum similarity score (0-1)

    Returns:
        List of matching content with scores
    """
    try:
        # Build filter
        must_conditions = [
            FieldCondition(
                key="user_id",
                match=MatchValue(value=user_id)
            )
        ]

        if content_type:
            must_conditions.append(
                FieldCondition(
                    key="content_type",
                    match=MatchValue(value=content_type)
                )
            )

        query_filter = Filter(must=must_conditions)

        # Search
        search_result = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=(vector_name, query_vector),
            query_filter=query_filter,
            limit=limit,
            score_threshold=score_threshold
        )

        # Format results
        results = []
        for point in search_result:
            results.append({
                "content_id": point.payload.get("content_id"),
                "score": point.score,
                "content_type": point.payload.get("content_type"),
                "metadata": {k: v for k, v in point.payload.items()
                           if k not in ["content_id", "user_id", "content_type", "created_at"]}
            })

        logger.info(f"Found {len(results)} similar content items for user {user_id}")
        return results

    except Exception as e:
        logger.error(f"Error searching similar content: {e}")
        return []


def hybrid_search(
    text_vector: List[float],
    image_vector: Optional[List[float]],
    user_id: int,
    content_type: Optional[str] = None,
    limit: int = 20,
    text_weight: float = 0.7,
    image_weight: float = 0.3
) -> List[Dict[str, Any]]:
    """
    Perform hybrid search combining text and image similarity

    Args:
        text_vector: Text query embedding
        image_vector: Optional image query embedding
        user_id: User ID for filtering
        content_type: Optional content type filter
        limit: Maximum results
        text_weight: Weight for text similarity (0-1)
        image_weight: Weight for image similarity (0-1)

    Returns:
        Combined and re-ranked results
    """
    try:
        # Get text-based results
        text_results = search_similar_content(
            query_vector=text_vector,
            user_id=user_id,
            vector_name="text",
            content_type=content_type,
            limit=limit * 2  # Get more to merge
        )

        if not image_vector:
            return text_results[:limit]

        # Get image-based results
        image_results = search_similar_content(
            query_vector=image_vector,
            user_id=user_id,
            vector_name="image",
            content_type=content_type,
            limit=limit * 2
        )

        # Combine results with weighted scores
        combined_scores = {}

        for result in text_results:
            content_id = result["content_id"]
            combined_scores[content_id] = {
                "content_id": content_id,
                "score": result["score"] * text_weight,
                "content_type": result["content_type"],
                "metadata": result["metadata"]
            }

        for result in image_results:
            content_id = result["content_id"]
            if content_id in combined_scores:
                combined_scores[content_id]["score"] += result["score"] * image_weight
            else:
                combined_scores[content_id] = {
                    "content_id": content_id,
                    "score": result["score"] * image_weight,
                    "content_type": result["content_type"],
                    "metadata": result["metadata"]
                }

        # Sort by combined score
        results = sorted(combined_scores.values(), key=lambda x: x["score"], reverse=True)

        logger.info(f"Hybrid search returned {len(results[:limit])} results")
        return results[:limit]

    except Exception as e:
        logger.error(f"Error in hybrid search: {e}")
        return []


def delete_content_vector(content_id: int) -> bool:
    """Delete content vector from Qdrant"""
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=[content_id]
        )
        logger.info(f"Deleted vector for content_id: {content_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting vector for content_id {content_id}: {e}")
        return False


def get_collection_stats() -> Dict[str, Any]:
    """Get statistics about the vector collection"""
    try:
        info = client.get_collection(collection_name=COLLECTION_NAME)
        return {
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status
        }
    except Exception as e:
        logger.error(f"Error getting collection stats: {e}")
        return {}


# Initialize collection on module import
initialize_collection()
