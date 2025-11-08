"""
Multimodal Embedding Service
Handles embeddings for text, images, and videos using state-of-the-art models
"""

from sentence_transformers import SentenceTransformer
from PIL import Image
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
import os
import tempfile
import base64
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize models
text_model = None
# Note: For CLIP image embeddings, we'd use a different model
# For now, we'll use a placeholder approach

def get_text_model():
    """Lazy load text embedding model"""
    global text_model
    if text_model is None:
        logger.info("Loading text embedding model...")
        text_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Text model loaded successfully")
    return text_model


def get_text_embedding(text: str) -> List[float]:
    """
    Generate embedding for text content

    Args:
        text: Input text

    Returns:
        384-dimensional embedding vector
    """
    try:
        model = get_text_model()
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Error generating text embedding: {e}")
        # Return zero vector as fallback
        return [0.0] * 384


def get_image_embedding_from_url(image_url: str) -> Optional[List[float]]:
    """
    Generate embedding for image from URL
    Uses Claude's vision capabilities for now (placeholder)

    Args:
        image_url: URL to the image

    Returns:
        512-dimensional embedding vector or None
    """
    try:
        # TODO: Implement actual image embedding using CLIP
        # For now, we'll return None to indicate no image embedding
        # In production, you would:
        # 1. Download the image from URL
        # 2. Use CLIP or similar model to generate embeddings
        # 3. Return the embedding vector

        logger.info(f"Image embedding requested for URL: {image_url}")
        return None
    except Exception as e:
        logger.error(f"Error generating image embedding: {e}")
        return None


def get_image_embedding_from_bytes(image_bytes: bytes) -> Optional[List[float]]:
    """
    Generate embedding for image from bytes

    Args:
        image_bytes: Image data in bytes

    Returns:
        512-dimensional embedding vector or None
    """
    try:
        # TODO: Implement actual image embedding using CLIP
        # For now, we'll extract basic visual features as a placeholder

        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize for consistency
        image = image.resize((224, 224))

        # Convert to numpy array
        img_array = np.array(image)

        # Extract basic features (placeholder)
        # In production, use CLIP model here
        features = extract_basic_visual_features(img_array)

        logger.info("Generated placeholder image embedding")
        return features

    except Exception as e:
        logger.error(f"Error generating image embedding from bytes: {e}")
        return None


def extract_basic_visual_features(image_array: np.ndarray) -> List[float]:
    """
    Extract basic visual features from image (placeholder for CLIP)

    Args:
        image_array: Numpy array of image (H, W, 3)

    Returns:
        512-dimensional feature vector
    """
    try:
        # This is a simplified feature extraction
        # In production, replace with CLIP embeddings

        features = []

        # Color histogram features (R, G, B channels)
        for channel in range(3):
            hist = cv2.calcHist([image_array], [channel], None, [32], [0, 256])
            features.extend(hist.flatten().tolist())

        # Texture features using edge detection
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.mean(edges) / 255.0
        features.append(edge_density)

        # Brightness and contrast
        features.append(np.mean(gray) / 255.0)
        features.append(np.std(gray) / 255.0)

        # Pad or truncate to 512 dimensions
        if len(features) < 512:
            features.extend([0.0] * (512 - len(features)))
        else:
            features = features[:512]

        # Normalize
        norm = np.linalg.norm(features)
        if norm > 0:
            features = (np.array(features) / norm).tolist()

        return features

    except Exception as e:
        logger.error(f"Error extracting visual features: {e}")
        return [0.0] * 512


def extract_video_keyframes(video_path: str, num_frames: int = 5) -> List[np.ndarray]:
    """
    Extract keyframes from video for analysis

    Args:
        video_path: Path to video file
        num_frames: Number of frames to extract

    Returns:
        List of frame arrays
    """
    try:
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if total_frames == 0:
            logger.warning("Video has no frames")
            return []

        # Calculate frame indices to extract
        frame_indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)

        frames = []
        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)

        cap.release()
        logger.info(f"Extracted {len(frames)} keyframes from video")
        return frames

    except Exception as e:
        logger.error(f"Error extracting video keyframes: {e}")
        return []


def get_video_embedding(video_url: str, video_description: str = "") -> Tuple[List[float], Optional[List[float]]]:
    """
    Generate embeddings for video content
    Combines text description with visual features from keyframes

    Args:
        video_url: URL to the video
        video_description: Text description of the video

    Returns:
        Tuple of (text_embedding, image_embedding)
    """
    try:
        # Get text embedding from description
        text_emb = get_text_embedding(video_description) if video_description else None

        # For now, we won't process actual video files
        # In production, you would:
        # 1. Download video from URL
        # 2. Extract keyframes
        # 3. Generate embeddings for each keyframe
        # 4. Aggregate keyframe embeddings

        logger.info(f"Generated video embedding for: {video_url}")
        return text_emb, None

    except Exception as e:
        logger.error(f"Error generating video embedding: {e}")
        return [0.0] * 384, None


def enhance_text_with_metadata(text: str, metadata: Dict[str, Any]) -> str:
    """
    Enhance text with relevant metadata for better search

    Args:
        text: Original text
        metadata: Content metadata

    Returns:
        Enhanced text for embedding
    """
    enhanced = text

    # Add title if present
    if 'title' in metadata:
        enhanced = f"{metadata['title']}. {enhanced}"

    # Add tags if present
    if 'tags' in metadata and isinstance(metadata['tags'], list):
        tags_str = " ".join(metadata['tags'])
        enhanced = f"{enhanced} Tags: {tags_str}"

    # Add author if present
    if 'author' in metadata:
        enhanced = f"{enhanced} By {metadata['author']}"

    # Add category if present
    if 'category' in metadata:
        enhanced = f"{enhanced} Category: {metadata['category']}"

    return enhanced


def get_multimodal_embedding(
    text: str,
    content_type: str,
    metadata: Dict[str, Any] = None,
    image_url: Optional[str] = None,
    image_bytes: Optional[bytes] = None
) -> Tuple[List[float], Optional[List[float]]]:
    """
    Generate appropriate embeddings based on content type

    Args:
        text: Text content
        content_type: Type of content (article, video, image, etc.)
        metadata: Additional metadata
        image_url: Optional image URL
        image_bytes: Optional image bytes

    Returns:
        Tuple of (text_embedding, image_embedding)
    """
    try:
        # Enhance text with metadata
        enhanced_text = enhance_text_with_metadata(text, metadata or {})

        # Get text embedding
        text_emb = get_text_embedding(enhanced_text)

        # Get image embedding based on content type
        image_emb = None

        if content_type in ['image', 'video'] and (image_url or image_bytes):
            if image_bytes:
                image_emb = get_image_embedding_from_bytes(image_bytes)
            elif image_url:
                image_emb = get_image_embedding_from_url(image_url)

        return text_emb, image_emb

    except Exception as e:
        logger.error(f"Error generating multimodal embedding: {e}")
        return [0.0] * 384, None


# Performance Tips for Production:
"""
To improve video and image search performance in production:

1. **Use CLIP for Image/Video Embeddings**:
   - Install: pip install transformers torch
   - Model: openai/clip-vit-base-patch32
   - Provides unified embedding space for text and images

2. **Video Processing Improvements**:
   - Extract keyframes at scene changes (not uniform intervals)
   - Use video transcription (Whisper API) for text content
   - Store per-scene embeddings for timestamp-level search
   - Use video summarization models

3. **Image Search Enhancements**:
   - OCR for text in images (pytesseract)
   - Object detection for semantic search (YOLO, Detectron2)
   - Face recognition for people search
   - Image captioning (BLIP, LLaVA) for description generation

4. **Hybrid Search Strategy**:
   - Combine dense vectors (embeddings) with sparse vectors (BM25)
   - Use metadata filters (date, type, tags) for pre-filtering
   - Re-rank results using cross-encoders
   - Implement user feedback loop for personalization

5. **Performance Optimizations**:
   - Batch embedding generation
   - Use GPU for embedding inference
   - Cache frequent embeddings
   - Quantize vectors (PQ, ANN) for faster search
   - Use approximate nearest neighbor (ANN) indices

6. **Claude Vision Integration**:
   - Use Claude's vision API for image understanding
   - Generate rich descriptions for images
   - Extract entities and relationships
   - Create searchable metadata from visual content
"""
