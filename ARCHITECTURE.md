# Synapse Architecture

## System Overview

Synapse is a full-stack knowledge management system built with three main components:

1. **FastAPI Backend** - Handles data storage, authentication, and AI-powered search
2. **React Frontend** - Beautiful visual interface for browsing and searching
3. **Chrome Extension** - Captures content from any webpage

## Data Flow

```
User browses web → Extension captures → API saves → Database stores
                                                    ↓
User searches → Frontend sends query → Claude AI processes → Results ranked
```

## Backend Architecture

### Database Schema

**Users Table**
- id (Primary Key)
- email (Unique)
- username (Unique)
- hashed_password
- created_at

**Contents Table**
- id (Primary Key)
- user_id (Foreign Key → Users)
- content_type (article, product, video, todo, note, quote, book)
- title
- raw_data (full content text)
- source_url
- metadata (JSON - type-specific fields)
- embedding_text (text used for embedding generation)
- created_at

**Embeddings Table**
- id (Primary Key)
- content_id (Foreign Key → Contents, Unique)
- vector (JSON array - embedding vector)
- model (embedding model name)
- created_at

### API Architecture

```
main.py (FastAPI App)
├── /api/auth/*          → auth.py (JWT authentication)
├── /api/content/*       → CRUD operations
└── /api/search          → ai_service.py (Claude integration)
```

### Authentication Flow

1. User registers/logs in
2. Server validates credentials
3. JWT token generated with user_id
4. Token stored in localStorage (frontend) / chrome.storage (extension)
5. Every API request includes: `Authorization: Bearer <token>`

### AI Search Pipeline

**Phase 1: Query Understanding**
```python
User query → Claude API → Extracts:
- Search terms
- Time filters (today, yesterday, last week, last month)
- Content type filters
- Price ranges
- Other metadata filters
```

**Phase 2: Vector Search**
```python
1. Generate embedding for search query
2. Calculate cosine similarity with all user's content embeddings
3. Filter by metadata (type, time, price)
4. Sort by similarity score
```

**Phase 3: Re-ranking**
```python
1. Take top 50 results
2. Send to Claude with original query
3. Claude re-ranks based on semantic relevance
4. Return top N results
```

## Frontend Architecture

### Component Tree

```
App
├── Router
    ├── /login → Login Page
    │            ├── Login Form
    │            └── Register Form
    │
    └── / → Dashboard
             ├── Navbar
             ├── SearchBar
             └── ContentGrid
                 └── ContentCard (x N)
                     ├── Header (type badge, delete)
                     ├── Title
                     ├── Content Renderer (type-specific)
                     └── Footer (date, source link)
```

### State Management

Simple useState hooks for:
- `isAuthenticated` - Auth state
- `contents` - All user content
- `filteredContents` - Search results
- `user` - Current user info
- `loading` - Loading states

No Redux/Context needed for MVP!

### API Communication

All API calls via fetch():
- Login/Register → Save token → Redirect
- Get contents → Display in grid
- Search → Update filtered contents
- Delete → Remove from state

## Extension Architecture

### Files & Responsibilities

**manifest.json**
- Extension configuration
- Permissions (activeTab, storage, scripting)
- Defines popup, content scripts, background worker

**popup.html/js**
- User interface when clicking extension icon
- Login/register forms
- Current page info display
- Content type selector
- Save button

**content.js**
- Runs on every webpage
- Extracts page content
- Can be extended for in-page UI

**background.js**
- Service worker (Manifest V3)
- Handles background tasks
- Currently minimal, can be extended

### Extension Flow

```
1. User clicks extension icon
   ↓
2. popup.html loads
   ↓
3. Check auth via chrome.storage
   ↓
4. If authenticated:
   - Show current page info
   - Auto-detect content type
   - Allow content type selection
   - Inject content.js to extract page content
   ↓
5. User clicks "Save"
   ↓
6. Extract page content via scripting API
   ↓
7. Send to API with auth token
   ↓
8. Show success message
```

## AI Integration Details

### Embedding Generation (Current MVP)

```python
# Simplified for MVP - uses hash-based pseudo-embeddings
def get_embedding_from_text(text):
    # 384-dimensional vector
    # Based on word hashing
    # Normalized for cosine similarity
```

**Note**: For production, replace with:
- OpenAI embeddings (text-embedding-3-small)
- Cohere embeddings
- Sentence Transformers
- Any proper embedding service

### Claude API Usage

**Query Parsing**
```python
Input: "Show me articles about AI from last week"
Claude extracts:
{
  "search_terms": "articles about AI",
  "time_filter": "last_week",
  "content_type": "article",
  "price_range": null
}
```

**Result Re-ranking**
```python
Input: Query + Top 50 results (title, type, snippet)
Output: Ranked array of content IDs by relevance
```

## Security Considerations

### Current Implementation
- JWT tokens with expiry
- Password hashing (bcrypt)
- CORS enabled for localhost
- HTTPBearer auth scheme

### For Production
- [ ] Rate limiting
- [ ] Input validation/sanitization
- [ ] SQL injection prevention (using ORM helps)
- [ ] XSS protection
- [ ] HTTPS only
- [ ] Refresh tokens
- [ ] Token rotation
- [ ] Environment-specific CORS

## Performance Optimization

### Current
- Simple SQLite queries
- In-memory similarity calculation
- No caching
- No pagination

### Recommended Improvements
- PostgreSQL with pgvector extension
- Redis caching for frequent queries
- Pagination (backend + frontend)
- Lazy loading images
- Debounced search input
- Virtual scrolling for large lists

## Scalability Path

### Database
```
SQLite → PostgreSQL → PostgreSQL + pgvector
```

### Vector Search
```
In-memory cosine similarity → pgvector → Pinecone/Weaviate/Qdrant
```

### Caching
```
None → Redis → Redis + CDN
```

### Deployment
```
Local → Single server → Load-balanced → Microservices
```

## Extension Points

Where to add features:

1. **New Content Types**
   - Add to `content_type` enum
   - Create renderer in ContentCard.js
   - Add auto-detection logic in extension

2. **Better Content Extraction**
   - Implement site-specific extractors
   - Use Puppeteer for JS-heavy sites
   - Add OCR for images

3. **Collaboration**
   - Add sharing endpoints
   - Implement permissions system
   - Real-time updates via WebSockets

4. **Mobile App**
   - React Native app
   - Share same backend API
   - Implement share target

5. **Integrations**
   - Notion export
   - Obsidian sync
   - Zapier webhooks
   - API for third-party apps

## Tech Decisions Explained

**Why FastAPI?**
- Fast, modern Python framework
- Auto-generated API docs
- Great async support
- Easy deployment

**Why SQLite?**
- Zero configuration
- Perfect for MVP
- Easy to migrate later
- File-based (portable)

**Why React (no framework)?**
- Familiar, widely-used
- Fast development
- No server-side rendering needed
- Easy state management for this scale

**Why Claude API?**
- Excellent natural language understanding
- Good at structured output (JSON)
- Competitive pricing
- Easy integration

**Why Manifest V3?**
- Chrome's new standard
- Required for new extensions
- Better security model

## Development Timeline (Actual)

- Backend setup: 30 min
- API endpoints: 45 min
- Frontend UI: 60 min
- Extension: 30 min
- Integration: 20 min
- Documentation: 25 min
**Total: ~3.5 hours**

## Future Roadmap

**v1.1 - Enhanced Features**
- [ ] Better embeddings (OpenAI/Cohere)
- [ ] Pagination
- [ ] Image support
- [ ] Tags/folders
- [ ] Export functionality

**v1.2 - Collaboration**
- [ ] Sharing
- [ ] Teams/workspaces
- [ ] Comments
- [ ] Activity feed

**v2.0 - Intelligence**
- [ ] Auto-summarization
- [ ] Related content suggestions
- [ ] Smart collections
- [ ] Insights & analytics
- [ ] Duplicate detection

**v3.0 - Ecosystem**
- [ ] Mobile apps
- [ ] Desktop apps
- [ ] Public API
- [ ] Plugin system
- [ ] Marketplace
