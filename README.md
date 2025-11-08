# Synapse - Your Second Brain

A full-stack intelligent knowledge management system that captures, organizes, and searches your content with AI-powered semantic search using Claude.

## Features

- **Capture Anything**: Browser extension to save content from any webpage
- **Intelligent Search**: Natural language search powered by Claude API
- **Visual Display**: Beautiful card-based UI for different content types
- **Multiple Content Types**: Articles, Products, Videos, Todos, Notes, Quotes, Books
- **Semantic Understanding**: AI-powered content classification and search

## Tech Stack

### Backend
- FastAPI (Python)
- SQLAlchemy + SQLite
- Claude API for semantic search and NLP
- JWT Authentication

### Frontend
- React 18
- React Router
- Axios for API calls
- Custom CSS (no heavy frameworks)

### Browser Extension
- Chrome Extension Manifest V3
- Vanilla JavaScript

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Chrome/Edge browser
- Anthropic API Key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=your-api-key-here
# SECRET_KEY=your-secret-key-change-this

# Run the server
python main.py
```

The backend will start on http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will start on http://localhost:3000

### 3. Browser Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The Synapse extension should now appear in your extensions

**Note**: You'll need to convert the icon.svg to icon.png for the extension to work properly. Use an online tool or:
```bash
# Using ImageMagick (if installed)
magick extension/icon.svg -resize 128x128 extension/icon.png
```

## Usage

### 1. Register/Login
- Open http://localhost:3000
- Create an account or login
- You'll be redirected to the dashboard

### 2. Capture Content
- Navigate to any webpage
- Click the Synapse extension icon
- Select the content type (auto-detected)
- Click "Save to Synapse"

### 3. Search Your Brain
- Use natural language queries:
  - "articles about AI from last week"
  - "products under $100"
  - "my todos from yesterday"
  - "quotes about new beginnings"

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Content
- `POST /api/content` - Save content
- `GET /api/content` - Get all content
- `GET /api/content/{id}` - Get specific content
- `DELETE /api/content/{id}` - Delete content
- `POST /api/search` - Semantic search

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # Database config
│   ├── auth.py              # Authentication logic
│   ├── ai_service.py        # Claude AI integration
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── App.js           # Main app component
│   │   └── index.js         # Entry point
│   └── package.json
│
└── extension/
    ├── manifest.json        # Extension config
    ├── popup.html           # Extension popup
    ├── popup.js             # Popup logic
    ├── content.js           # Content script
    └── background.js        # Background service worker
```

## Content Types

The system intelligently handles different content types:

- **Article** 📄: Blog posts, news articles, documentation
- **Product** 🛍️: E-commerce items with pricing
- **Video** 🎬: YouTube videos with embedded player
- **Todo** ✅: Task lists and checklists
- **Note** 📝: General notes and text
- **Quote** 💬: Memorable quotes
- **Book** 📚: Book references

## AI Features

### Semantic Search
- Uses Claude to understand natural language queries
- Extracts filters (time, type, price) from queries
- Generates embeddings for similarity matching
- Re-ranks results for better relevance

### Auto-Detection
- Content type detection from URL patterns
- Metadata extraction (price, video IDs, etc.)
- Smart content classification

## Development Notes

### For Production
1. **Switch to proper embedding service**:
   - Current implementation uses placeholder embeddings
   - Recommend: OpenAI embeddings, Cohere, or similar

2. **Database**:
   - Migrate from SQLite to PostgreSQL
   - Use pgvector for efficient vector search

3. **Security**:
   - Update CORS origins
   - Use environment-specific configs
   - Implement rate limiting

4. **Extension**:
   - Convert SVG icon to PNG (128x128, 48x48, 16x16)
   - Submit to Chrome Web Store

### Known Limitations
- Embedding generation is simplified for MVP
- No pagination on frontend
- Extension icon needs PNG conversion

## Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Ensure virtual environment is activated
- Verify .env file exists with API key

### Frontend connection errors
- Ensure backend is running on port 8000
- Check CORS settings if using different ports

### Extension not working
- Reload extension after code changes
- Check console for errors
- Verify manifest.json is valid

## License

MIT License - feel free to use for your project!

## Credits

Built for Appointy Task Round - Project Synapse Challenge
