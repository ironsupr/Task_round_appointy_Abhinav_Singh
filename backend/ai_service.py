from anthropic import Anthropic
import os
from dotenv import load_dotenv
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import json
import re
import logging
from functools import lru_cache
import hashlib
from datetime import datetime, timedelta
import time
from collections import deque
import requests
import urllib.parse

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Claude client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Rate limiting configuration
class RateLimiter:
    """Simple rate limiter for API calls"""
    def __init__(self, max_calls: int = 10, window_seconds: int = 60):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.calls = deque()

    def can_call(self) -> bool:
        """Check if we can make an API call"""
        now = time.time()
        # Remove old calls outside the window
        while self.calls and self.calls[0] < now - self.window_seconds:
            self.calls.popleft()
        return len(self.calls) < self.max_calls

    def record_call(self):
        """Record an API call"""
        self.calls.append(time.time())

    def wait_time(self) -> float:
        """Return seconds to wait before next call is allowed"""
        if self.can_call():
            return 0
        oldest_call = self.calls[0]
        wait = self.window_seconds - (time.time() - oldest_call)
        return max(0, wait)

# Initialize rate limiters
claude_rate_limiter = RateLimiter(max_calls=30, window_seconds=60)  # 30 calls per minute
embedding_cache = {}  # Simple in-memory cache for embeddings
query_cache = {}  # Cache for parsed queries

def sanitize_user_input(text: str) -> str:
    """Sanitize user input to prevent prompt injection attacks"""
    if not text:
        return ""

    # Remove potential prompt injection patterns
    injection_patterns = [
        r'(ignore|disregard|forget|override|bypass).*(previous|above|prior|all).*(instruction|prompt|command|rule)',
        r'(you are now|you must now|from now on)',
        r'(system|admin|root).*(prompt|message|command)',
        r'<[^>]+>',  # Remove HTML/XML tags
    ]

    sanitized = text
    for pattern in injection_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)

    # Limit length to prevent token overflow attacks
    max_length = 1000
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized.strip()

def extract_json_safely(text: str, expected_type: str = 'object') -> Optional[Any]:
    """
    Safely extract JSON from text with robust parsing

    Args:
        text: Text potentially containing JSON
        expected_type: 'object' for {} or 'array' for []

    Returns:
        Parsed JSON or None if extraction fails
    """
    if not text:
        return None

    try:
        # Try to parse the entire text first (in case it's pure JSON)
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Use regex to find JSON structures
    if expected_type == 'object':
        # Match complete JSON objects
        pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    else:  # array
        # Match complete JSON arrays
        pattern = r'\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]'

    matches = re.findall(pattern, text, re.DOTALL)

    for match in matches:
        try:
            parsed = json.loads(match)
            return parsed
        except json.JSONDecodeError:
            continue

    # If no valid JSON found, try to find JSON-like structure and clean it
    if expected_type == 'object':
        start_idx = text.find('{')
        end_idx = text.rfind('}')
    else:
        start_idx = text.find('[')
        end_idx = text.rfind(']')

    if start_idx != -1 and end_idx > start_idx:
        potential_json = text[start_idx:end_idx + 1]
        try:
            return json.loads(potential_json)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON from extracted text: {potential_json[:100]}...")

    return None

def validate_input_parameters(**kwargs) -> Tuple[bool, str]:
    """
    Validate input parameters for functions

    Returns:
        Tuple of (is_valid, error_message)
    """
    for param_name, param_value in kwargs.items():
        if param_name == 'query':
            if not param_value or not isinstance(param_value, str):
                return False, f"Invalid query parameter: must be non-empty string"
            if len(param_value) > 5000:
                return False, f"Query too long: {len(param_value)} characters (max 5000)"

        elif param_name == 'text':
            if not param_value or not isinstance(param_value, str):
                return False, f"Invalid text parameter: must be non-empty string"
            if len(param_value) > 50000:
                return False, f"Text too long: {len(param_value)} characters (max 50000)"

        elif param_name == 'results':
            if not isinstance(param_value, list):
                return False, f"Invalid results parameter: must be a list"
            for idx, result in enumerate(param_value):
                if not isinstance(result, dict):
                    return False, f"Invalid result at index {idx}: must be a dictionary"
                if 'title' not in result or 'raw_data' not in result:
                    return False, f"Invalid result at index {idx}: missing required fields"

        elif param_name == 'limit':
            if not isinstance(param_value, int):
                return False, f"Invalid limit parameter: must be an integer"
            if param_value <= 0 or param_value > 100:
                return False, f"Invalid limit value: {param_value} (must be 1-100)"

    return True, ""

@lru_cache(maxsize=1000)
def get_embedding_from_text_cached(text_hash: str) -> List[float]:
    """Cached wrapper for embedding generation"""
    # This is called with a hash, so we need to get the actual text
    # In practice, you'd store both hash and text in the cache
    return _get_embedding_from_text_impl(text_hash)

def get_embedding_from_text(text: str) -> List[float]:
    """
    Generate semantic embedding using SentenceTransformer.
    Uses the multimodal_service for high-quality embeddings.
    """
    # Validate input
    is_valid, error_msg = validate_input_parameters(text=text)
    if not is_valid:
        logger.error(f"Input validation failed: {error_msg}")
        return [0.0] * 384

    # Create a hash for caching
    text_hash = hashlib.md5(text.encode()).hexdigest()

    # Check cache first
    if text_hash in embedding_cache:
        logger.debug(f"Embedding cache hit for text hash: {text_hash}")
        return embedding_cache[text_hash]

    # Generate embedding using multimodal service
    try:
        from multimodal_service import get_text_embedding as get_semantic_embedding
        embedding = get_semantic_embedding(text)
        logger.info(f"Generated semantic embedding with dimension: {len(embedding)}")
    except Exception as e:
        logger.error(f"Error generating semantic embedding: {e}")
        # Fallback to simple implementation
        embedding = _get_embedding_from_text_impl(text)

    # Store in cache
    embedding_cache[text_hash] = embedding

    return embedding

def _get_embedding_from_text_impl(text: str) -> List[float]:
    """Internal implementation of embedding generation"""
    # For MVP: Simple hash-based embedding (you'd want to use a proper embedding model)
    # This is a placeholder - in production use OpenAI embeddings or similar
    words = text.lower().split()

    # Create a simple 384-dimensional embedding based on word features
    embedding = [0.0] * 384

    # Use word hashing to create a pseudo-embedding
    for i, word in enumerate(words[:100]):  # Limit to first 100 words
        hash_val = hash(word)
        for j in range(min(len(word), 384)):
            embedding[j] += (hash_val % 100) / 100.0

    # Normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = [x / norm for x in embedding]

    return embedding

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    # Validate vector dimensions match
    if len(vec1) != len(vec2):
        logger.warning(f"Vector dimension mismatch: {len(vec1)} vs {len(vec2)}")
        return 0.0

    try:
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)

        # Check for NaN or Inf values
        if np.any(np.isnan(vec1_np)) or np.any(np.isnan(vec2_np)):
            logger.warning("NaN values detected in vectors")
            return 0.0
        if np.any(np.isinf(vec1_np)) or np.any(np.isinf(vec2_np)):
            logger.warning("Inf values detected in vectors")
            return 0.0

        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = float(dot_product / (norm1 * norm2))

        # Clamp to [-1, 1] to handle floating point errors
        return max(-1.0, min(1.0, similarity))

    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def parse_search_query(query: str) -> Dict[str, Any]:
    """
    Use Claude to understand the search query and extract filters
    Note: Removed unused contents_data parameter (Issue #9)
    """
    # Validate input
    is_valid, error_msg = validate_input_parameters(query=query)
    if not is_valid:
        logger.error(f"Input validation failed: {error_msg}")
        return {"search_terms": "", "time_filter": None, "content_type": None, "price_range": None, "other_filters": {}}

    # Sanitize user input to prevent prompt injection
    sanitized_query = sanitize_user_input(query)

    # Check cache first
    query_hash = hashlib.md5(sanitized_query.encode()).hexdigest()
    if query_hash in query_cache:
        logger.debug(f"Query cache hit for: {sanitized_query[:50]}...")
        return query_cache[query_hash]

    # Check rate limit
    if not claude_rate_limiter.can_call():
        wait_time = claude_rate_limiter.wait_time()
        logger.warning(f"Rate limit reached. Would need to wait {wait_time:.1f} seconds")
        # Return basic parsing without Claude
        return {"search_terms": sanitized_query, "time_filter": None, "content_type": None, "price_range": None, "other_filters": {}}

    try:
        prompt = f"""Analyze this search query and extract search intent and filters:

Query: "{sanitized_query}"

Based on this query, provide:
1. The core search terms (what the user is looking for)
2. Any time filters (today, yesterday, last week, last month, etc.)
3. Any type filters (article, product, video, todo, note, book, quote)
4. Any price filters (if mentioned)
5. Any other metadata filters

Respond in JSON format:
{{
    "search_terms": "core search terms",
    "time_filter": "today|yesterday|last_week|last_month|null",
    "content_type": "article|product|video|todo|note|book|quote|null",
    "price_range": {{"min": 0, "max": 1000}} or null,
    "other_filters": {{}}
}}"""

        claude_rate_limiter.record_call()

        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text

        # Use robust JSON extraction
        parsed = extract_json_safely(response_text, 'object')

        if parsed and isinstance(parsed, dict):
            # Validate the parsed response has expected keys
            expected_keys = {"search_terms", "time_filter", "content_type", "price_range", "other_filters"}
            if expected_keys.issubset(parsed.keys()):
                # Cache the result
                query_cache[query_hash] = parsed
                return parsed
            else:
                logger.warning(f"Parsed JSON missing expected keys. Got: {parsed.keys()}")

        # Fallback if parsing fails
        logger.warning("Failed to parse Claude response, using fallback")
        result = {"search_terms": sanitized_query, "time_filter": None, "content_type": None, "price_range": None, "other_filters": {}}
        query_cache[query_hash] = result
        return result

    except Exception as e:
        logger.error(f"Error parsing query with Claude: {e}", exc_info=True)
        result = {"search_terms": sanitized_query, "time_filter": None, "content_type": None, "price_range": None, "other_filters": {}}
        # Still cache the fallback to avoid repeated failed attempts
        query_cache[query_hash] = result
        return result

def rank_results_with_claude(query: str, results: List[Dict[str, Any]], limit: int = 20) -> List[Dict[str, Any]]:
    """
    Use Claude to re-rank search results for better relevance
    """
    # Validate all parameters
    is_valid, error_msg = validate_input_parameters(query=query, results=results, limit=limit)
    if not is_valid:
        logger.error(f"Input validation failed: {error_msg}")
        return results[:min(limit, len(results))]

    # Sanitize query
    sanitized_query = sanitize_user_input(query)

    # Validate and clamp limit
    if limit <= 0:
        logger.warning(f"Invalid limit {limit}, using default of 20")
        limit = 20
    if limit > 100:
        logger.warning(f"Limit {limit} exceeds maximum, capping at 100")
        limit = 100

    if not results:
        return []

    # If we have few results, just return them
    if len(results) <= limit:
        return results

    # Check rate limit
    if not claude_rate_limiter.can_call():
        wait_time = claude_rate_limiter.wait_time()
        logger.warning(f"Rate limit reached. Would need to wait {wait_time:.1f} seconds. Returning unranked results.")
        return results[:limit]

    try:
        # Prepare context for Claude
        results_context = []
        for idx, result in enumerate(results[:50]):  # Limit to top 50 for token efficiency
            # Safely handle None values in raw_data
            raw_data = result.get("raw_data") or ""
            results_context.append({
                "id": idx,
                "title": result.get("title", ""),
                "type": result.get("content_type", ""),
                "snippet": raw_data[:200]
            })

        prompt = f"""Given this search query: "{sanitized_query}"

Rank these content items by relevance (most relevant first). Consider:
- Semantic similarity to the query
- Content type appropriateness
- Title and content relevance

Content items:
{json.dumps(results_context, indent=2)}

Respond with only a JSON array of IDs in order of relevance, like: [3, 1, 5, 2, ...]
Return top {limit} items."""

        claude_rate_limiter.record_call()

        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text

        # Use robust JSON extraction for arrays
        ranked_ids = extract_json_safely(response_text, 'array')

        if ranked_ids and isinstance(ranked_ids, list):
            # Validate that ranked_ids contains integers (Issue #12)
            validated_ids = []
            for rid in ranked_ids:
                if isinstance(rid, int) and 0 <= rid < len(results):
                    validated_ids.append(rid)
                else:
                    logger.warning(f"Invalid ID in ranking: {rid} (type: {type(rid)})")

            # Reorder results based on validated ranking
            ranked_results = []
            for rid in validated_ids[:limit]:
                ranked_results.append(results[rid])

            # If we don't have enough ranked results, fill with unranked ones
            if len(ranked_results) < limit:
                used_ids = set(validated_ids)
                for idx, result in enumerate(results):
                    if idx not in used_ids:
                        ranked_results.append(result)
                        if len(ranked_results) >= limit:
                            break

            return ranked_results
        else:
            logger.warning("Failed to extract valid ranking from Claude response")

    except Exception as e:
        logger.error(f"Error ranking with Claude: {e}", exc_info=True)

    # Fallback: return top results by similarity
    return results[:limit]

def classify_content_type(title: str, content: str, url: str) -> str:
    """
    Classify content into appropriate type using Claude
    This addresses Issue #2 - server-side content classification
    """
    # Simple URL-based classification first (fast path)
    url_lower = url.lower() if url else ""

    # Check for known patterns
    if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'video'
    elif 'amazon.com' in url_lower or 'ebay.com' in url_lower or 'shop' in url_lower:
        return 'product'
    elif 'github.com' in url_lower and '/issues/' in url_lower:
        return 'todo'
    elif 'goodreads.com' in url_lower or 'book' in title.lower():
        return 'book'

    # For other content, use Claude for classification (with rate limiting)
    if not claude_rate_limiter.can_call():
        # Fallback to simple heuristics
        content_lower = content.lower() if content else ""
        if 'price' in content_lower or '$' in content:
            return 'product'
        elif len(content) < 200 and ('"' in content or '"' in content):
            return 'quote'
        elif 'todo' in content_lower or 'task' in content_lower:
            return 'todo'
        else:
            return 'article'  # Default

    try:
        prompt = f"""Classify this content into ONE of these categories:
- article (blog post, news, documentation)
- product (e-commerce item, something for sale)
- video (video content)
- todo (task, checklist item)
- note (personal note, memo)
- book (book reference, review)
- quote (notable quote, saying)

Title: {title[:100]}
URL: {url}
Content preview: {content[:200]}

Respond with just the category name."""

        claude_rate_limiter.record_call()

        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}]
        )

        category = message.content[0].text.strip().lower()
        valid_categories = {'article', 'product', 'video', 'todo', 'note', 'book', 'quote'}

        if category in valid_categories:
            return category

    except Exception as e:
        logger.error(f"Error classifying content with Claude: {e}")

    return 'article'  # Default fallback

# Utility function to clear caches (useful for testing)
def clear_caches():
    """Clear all in-memory caches"""
    global embedding_cache, query_cache
    embedding_cache.clear()
    query_cache.clear()
    get_embedding_from_text_cached.cache_clear()
    logger.info("All caches cleared")

def fetch_book_metadata(title: str, author: Optional[str] = None, isbn: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch book metadata from Google Books API or Open Library API

    Args:
        title: Book title to search for
        author: Optional author name for better matching
        isbn: Optional ISBN for exact matching

    Returns:
        Dictionary with book metadata including cover, author, rating, etc.
    """
    metadata = {}

    try:
        # Try Google Books API first
        google_books_url = "https://www.googleapis.com/books/v1/volumes"

        # Build query
        if isbn:
            query = f"isbn:{isbn}"
        elif author:
            query = f"intitle:{title} inauthor:{author}"
        else:
            query = f"intitle:{title}"

        params = {
            "q": query,
            "maxResults": 1,
            "printType": "books"
        }

        response = requests.get(google_books_url, params=params, timeout=5)

        if response.status_code == 200:
            data = response.json()

            if data.get("totalItems", 0) > 0:
                book = data["items"][0]["volumeInfo"]

                # Extract metadata
                metadata["title"] = book.get("title", title)
                metadata["author"] = ", ".join(book.get("authors", []))
                metadata["publisher"] = book.get("publisher", "")
                metadata["publishedDate"] = book.get("publishedDate", "")
                metadata["description"] = book.get("description", "")
                metadata["pageCount"] = book.get("pageCount", 0)
                metadata["categories"] = book.get("categories", [])

                # Get cover image (prefer thumbnail)
                if "imageLinks" in book:
                    metadata["cover"] = book["imageLinks"].get("thumbnail",
                                       book["imageLinks"].get("smallThumbnail", ""))
                    # Use HTTPS for images
                    if metadata["cover"] and metadata["cover"].startswith("http:"):
                        metadata["cover"] = metadata["cover"].replace("http:", "https:")

                # Get ISBN
                if "industryIdentifiers" in book:
                    for identifier in book["industryIdentifiers"]:
                        if identifier["type"] in ["ISBN_13", "ISBN_10"]:
                            metadata["isbn"] = identifier["identifier"]
                            break

                # Get rating if available
                metadata["rating"] = book.get("averageRating", None)
                metadata["ratingsCount"] = book.get("ratingsCount", 0)

                logger.info(f"Successfully fetched book metadata from Google Books for: {title}")
                return metadata

    except requests.RequestException as e:
        logger.error(f"Error fetching from Google Books API: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching book metadata: {e}")

    # Fallback to Open Library API if Google Books fails
    try:
        # Search for the book
        search_url = "https://openlibrary.org/search.json"
        params = {
            "title": title,
            "limit": 1
        }

        if author:
            params["author"] = author

        response = requests.get(search_url, params=params, timeout=5)

        if response.status_code == 200:
            data = response.json()

            if data.get("numFound", 0) > 0:
                book = data["docs"][0]

                # Extract metadata
                metadata["title"] = book.get("title", title)
                metadata["author"] = ", ".join(book.get("author_name", []))
                metadata["publisher"] = ", ".join(book.get("publisher", []))
                metadata["publishedDate"] = str(book.get("first_publish_year", ""))

                # Get cover from Open Library
                if "cover_i" in book:
                    cover_id = book["cover_i"]
                    metadata["cover"] = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                elif "isbn" in book and len(book["isbn"]) > 0:
                    # Try to get cover by ISBN
                    isbn = book["isbn"][0]
                    metadata["cover"] = f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
                    metadata["isbn"] = isbn

                # Get ratings (Open Library doesn't provide ratings, so we'll skip)
                metadata["rating"] = None

                logger.info(f"Successfully fetched book metadata from Open Library for: {title}")
                return metadata

    except requests.RequestException as e:
        logger.error(f"Error fetching from Open Library API: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching book metadata from Open Library: {e}")

    # Return whatever metadata we could gather
    return metadata

def enrich_book_content(content_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich book content with metadata from APIs

    Args:
        content_data: Dictionary containing book content data

    Returns:
        Enriched content data with book metadata
    """
    if content_data.get("content_type") != "book":
        return content_data

    # Extract book info from content
    title = content_data.get("title", "")

    # Try to extract author from metadata or content
    author = None
    if "metadata" in content_data and "author" in content_data["metadata"]:
        author = content_data["metadata"]["author"]

    # Try to extract ISBN if available
    isbn = None
    if "metadata" in content_data and "isbn" in content_data["metadata"]:
        isbn = content_data["metadata"]["isbn"]

    # Fetch metadata
    book_metadata = fetch_book_metadata(title, author, isbn)

    # Merge with existing metadata
    if "metadata" not in content_data:
        content_data["metadata"] = {}

    content_data["metadata"].update(book_metadata)

    return content_data

# Log initialization
logger.info("AI service initialized with enhanced error handling, caching, rate limiting, and book metadata fetching")