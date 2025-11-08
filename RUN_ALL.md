# Run All - Complete Startup Guide

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] Chrome/Edge browser
- [ ] Anthropic API key (get from https://console.anthropic.com/)

## Step-by-Step Startup

### 1. Setup Backend Environment

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment (recommended)
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create `backend/.env` file with:

```env
DATABASE_URL=sqlite:///./synapse.db
SECRET_KEY=change-this-to-a-random-secret-key-in-production
ANTHROPIC_API_KEY=your-actual-anthropic-api-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

**IMPORTANT**: Replace `your-actual-anthropic-api-key-here` with your real API key!

### 3. Start Backend

```bash
# Make sure you're in backend directory
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Leave this terminal running! ✅

### 4. Start Frontend (New Terminal)

```bash
# Open NEW terminal
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Browser should auto-open to http://localhost:3000 ✅

### 5. Load Extension

1. Open Chrome
2. Navigate to: `chrome://extensions/`
3. Enable "Developer mode" (toggle top-right)
4. Click "Load unpacked"
5. Select the `extension` folder
6. Extension loaded! ✅

**Note**: The icon might not show properly. This is fine for testing.
To fix, convert `extension/icon.svg` to PNG using an online converter.

### 6. Test the System

#### A. Test Backend
```bash
# In backend directory
python test_api.py
```

Should show all tests passing ✅

#### B. Test Frontend
1. Go to http://localhost:3000
2. Click "Register"
3. Create account (any email/username/password)
4. You should see empty dashboard ✅

#### C. Test Extension
1. Go to any website (e.g., youtube.com)
2. Click Synapse extension icon
3. Login with same credentials
4. Click "Save to Synapse"
5. Success message appears ✅

#### D. Test Search
1. Go back to dashboard
2. Search bar: type "videos"
3. Should find your saved video ✅

## Common Startup Issues

### "Module not found" (Backend)
```bash
cd backend
pip install -r requirements.txt
```

### "Cannot find module" (Frontend)
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### "Connection refused" (Frontend)
Backend isn't running on port 8000. Check backend terminal.

### "Unauthorized" (Extension)
Login credentials don't match. Use same username/password as frontend.

### Extension icon missing
Convert icon.svg to icon.png (128x128) or ignore for now.

## Stopping Everything

### Stop Backend
Press `Ctrl+C` in backend terminal

### Stop Frontend
Press `Ctrl+C` in frontend terminal

### Unload Extension
Go to `chrome://extensions/` → Click "Remove"

## Quick Commands Reference

### Backend
```bash
cd backend
python main.py              # Start server
python test_api.py          # Test API
```

### Frontend
```bash
cd frontend
npm start                   # Start dev server
npm run build               # Build for production
```

### Both
```bash
# Windows (PowerShell):
# Backend terminal:
cd backend; python main.py

# Frontend terminal:
cd frontend; npm start

# Mac/Linux:
# Backend terminal:
cd backend && python main.py

# Frontend terminal:
cd frontend && npm start
```

## Verify Everything is Running

### Backend Check
Open: http://localhost:8000
Should see: `{"message":"Synapse API is running","version":"1.0.0"}`

### Frontend Check
Open: http://localhost:3000
Should see: Beautiful login page

### API Docs Check
Open: http://localhost:8000/docs
Should see: Interactive API documentation

### Extension Check
Click extension icon → Should see Synapse popup

## Next Steps After Startup

1. **Create an account** on http://localhost:3000
2. **Save some content** using the extension
3. **Try natural language search**:
   - "videos from today"
   - "articles about technology"
   - "my notes"
4. **Explore different content types**:
   - Articles from Medium/blogs
   - Videos from YouTube
   - Products from e-commerce sites
   - Notes from any text

## Production Deployment (Future)

### Backend
- Deploy to: Railway, Render, DigitalOcean, AWS
- Use PostgreSQL instead of SQLite
- Add proper environment variables
- Enable HTTPS

### Frontend
- Deploy to: Vercel, Netlify, AWS S3+CloudFront
- Update API URL to production backend
- Build: `npm run build`

### Extension
- Convert SVG icons to PNG (16, 48, 128)
- Update manifest version
- Submit to Chrome Web Store

## Getting Help

1. Check `README.md` for detailed docs
2. Check `ARCHITECTURE.md` for system design
3. Check `QUICK_START.md` for troubleshooting
4. Review error messages carefully
5. Ensure all prerequisites are installed

## Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Extension loaded in Chrome
- [ ] Can create account
- [ ] Can save content
- [ ] Can search content
- [ ] All tests passing

If all checked, you're ready to go! 🎉

---

**Happy building with Synapse!** 🧠✨
