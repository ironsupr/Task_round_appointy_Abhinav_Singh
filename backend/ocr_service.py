"""
OCR Service for processing images and extracting text
"""

import base64
import io
import re
from typing import Dict, Any, Optional
from PIL import Image
import pytesseract
import cv2
import numpy as np

# Configure Tesseract path (update this based on your system)
# For Windows, try to find Tesseract automatically
import platform
import os

if platform.system() == 'Windows':
    # Try common Windows paths for Tesseract
    possible_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Users\abhin\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'
    ]

    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break
    else:
        # If not found in common paths, assume it's in PATH
        # The tesseract command seems to be working from the test above
        pass

def preprocess_image_for_ocr(image: Image.Image) -> np.ndarray:
    """
    Preprocess image to improve OCR accuracy
    """
    # Convert PIL image to OpenCV format
    img_array = np.array(image)

    # Convert to grayscale if needed
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array

    # Apply thresholding to get a binary image
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Denoise the image
    denoised = cv2.medianBlur(binary, 1)

    # Resize if image is too small
    height, width = denoised.shape
    if width < 1000:
        scale_factor = 1000 / width
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        denoised = cv2.resize(denoised, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

    return denoised

def extract_text_from_image(image_data: bytes) -> Dict[str, Any]:
    """
    Extract text from image using OCR

    Args:
        image_data: Image data in bytes

    Returns:
        Dictionary containing extracted text and metadata
    """
    try:
        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))

        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')

        # Preprocess image for better OCR results
        processed_img = preprocess_image_for_ocr(image)

        # Perform OCR with different configs for better results
        configs = [
            '--oem 3 --psm 6',  # Default: Uniform block of text
            '--oem 3 --psm 3',  # Fully automatic page segmentation
            '--oem 3 --psm 11', # Sparse text
        ]

        best_text = ""
        best_confidence = 0

        for config in configs:
            try:
                # Get text with confidence scores
                data = pytesseract.image_to_data(processed_img, config=config, output_type=pytesseract.Output.DICT)

                # Filter out low confidence text
                text_elements = []
                total_confidence = 0
                count = 0

                for i in range(len(data['text'])):
                    if int(data['conf'][i]) > 30:  # Confidence threshold
                        text = data['text'][i].strip()
                        if text:
                            text_elements.append(text)
                            total_confidence += int(data['conf'][i])
                            count += 1

                if count > 0:
                    avg_confidence = total_confidence / count
                    extracted_text = ' '.join(text_elements)

                    if avg_confidence > best_confidence:
                        best_text = extracted_text
                        best_confidence = avg_confidence
            except Exception as e:
                print(f"OCR config {config} failed: {e}")
                continue

        # If no good text found, try simple extraction
        if not best_text:
            best_text = pytesseract.image_to_string(processed_img)

        # Clean up the text
        best_text = clean_ocr_text(best_text)

        # Detect if it's a todo list
        is_todo = detect_todo_list_pattern(best_text)

        return {
            "success": True,
            "text": best_text,
            "confidence": best_confidence,
            "is_todo_list": is_todo,
            "line_count": len(best_text.split('\n')),
            "word_count": len(best_text.split()),
        }

    except Exception as e:
        print(f"OCR Error: {e}")
        # Try alternative OCR library or fallback
        try:
            # Fallback to simple extraction
            image = Image.open(io.BytesIO(image_data))
            simple_text = pytesseract.image_to_string(image)
            return {
                "success": True,
                "text": clean_ocr_text(simple_text),
                "confidence": 50,
                "is_todo_list": detect_todo_list_pattern(simple_text),
                "fallback": True
            }
        except:
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0
            }

def clean_ocr_text(text: str) -> str:
    """
    Clean and format OCR extracted text
    """
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)

    # Fix common OCR errors
    replacements = {
        ' ,': ',',
        ' .': '.',
        ' !': '!',
        ' ?': '?',
        ' ;': ';',
        ' :': ':',
        '( ': '(',
        ' )': ')',
        '[ ': '[',
        ' ]': ']',
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Split into lines and clean each line
    lines = text.split('\n')
    cleaned_lines = []

    for line in lines:
        line = line.strip()
        if line and len(line) > 2:  # Ignore very short lines (likely noise)
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)

def detect_todo_list_pattern(text: str) -> bool:
    """
    Detect if the text appears to be a todo list
    """
    if not text:
        return False

    lines = text.split('\n')
    todo_indicators = 0
    total_lines = len([l for l in lines if l.strip()])

    if total_lines == 0:
        return False

    todo_patterns = [
        r'^[-*•]\s+',           # Bullet points
        r'^\d+[.)]\s+',          # Numbered lists (1. or 1))
        r'^\[[\sx]\]',           # Checkboxes
        r'^(TODO|TASK|DONE|PENDING):',  # Keywords
        r'^✓|✔|☐|☑|⬜|✅',      # Unicode checkmarks
        r'^(Buy|Get|Call|Email|Meet|Finish|Complete|Check|Review|Send|Write|Read|Study)',  # Action verbs
    ]

    for line in lines:
        line = line.strip()
        if line:
            for pattern in todo_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    todo_indicators += 1
                    break

    # Consider it a todo list if:
    # - More than 40% of lines match todo patterns
    # - OR has at least 3 todo indicators and less than 10 lines (short lists)
    todo_ratio = todo_indicators / total_lines if total_lines > 0 else 0

    return (todo_ratio > 0.4) or (todo_indicators >= 3 and total_lines < 10)

def format_as_todo_list(text: str) -> str:
    """
    Format text as a markdown todo list
    """
    lines = text.split('\n')
    formatted_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Remove existing list markers
        line = re.sub(r'^[-*•]\s+', '', line)
        line = re.sub(r'^\d+[.)]\s+', '', line)
        line = re.sub(r'^\[[\sx]\]\s*', '', line)
        line = re.sub(r'^✓|✔|☐|☑|⬜|✅\s*', '', line)

        # Detect if item is marked as done
        is_done = any([
            re.search(r'\[x\]', line, re.IGNORECASE),
            re.search(r'✓|✔|☑|✅', line),
            re.search(r'\b(done|completed|finished)\b', line, re.IGNORECASE)
        ])

        # Remove done indicators from the text
        line = re.sub(r'\b(done|completed|finished)\b', '', line, flags=re.IGNORECASE).strip()

        # Format as checkbox
        checkbox = '[x]' if is_done else '[ ]'
        formatted_lines.append(f"- {checkbox} {line}")

    return '\n'.join(formatted_lines)