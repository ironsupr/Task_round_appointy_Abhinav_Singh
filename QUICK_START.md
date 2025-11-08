# Quick Start Guide - Synapse

Get up and running in 5 minutes!

## Step 1: Backend (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "DATABASE_URL=sqlite:///./synapse.db" > .env
echo "SECRET_KEY=my-super-secret-key-change-in-production" >> .env
echo "ANTHROPIC_API_KEY=your-anthropic-api-key-here" >> .env
echo "ALGORITHM=HS256" >> .env
echo "ACCESS_TOKEN_EXPIRE_MINUTES=10080" >> .env

# Edit .env and add your REAL Anthropic API key!

# Run server
python main.py
```

Backend should be running on http://localhost:8000

## Step 2: Frontend (2 minutes)

Open a NEW terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Frontend should open automatically on http://localhost:3000

## Step 3: Browser Extension (1 minute)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `extension` folder
6. Done!

## Step 4: Test It Out!

### Create Account
1. Go to http://localhost:3000
2. Click "Register"
3. Fill in email, username, password
4. Login automatically

### Save Some Content
1. Navigate to any webpage (e.g., YouTube, Medium, Reddit)
2. Click Synapse extension icon
3. Select content type
4. Click "Save to Synapse"

### Search Your Brain
1. Go back to dashboard (http://localhost:3000)
2. Type a natural language query:
   - "videos I saved today"
   - "articles about technology"
   - "show me my notes"

## Common Issues

### "Connection error" in extension
➜ Make sure backend is running on http://localhost:8000

### "Module not found" errors
➜ Run `pip install -r requirements.txt` or `npm install`

### Extension icon not showing
➜ Convert icon.svg to icon.png (128x128) or use a placeholder PNG

### Search returns empty results
➜ Make sure you've saved some content first!

## Testing the AI Search

Try these natural language searches:

```
"articles I saved last week"
"videos about programming"
"my todo lists"
"products under $50"
"quotes I saved yesterday"
```

The Claude API will parse your intent and find relevant content!

## What's Next?

- Save more content using the extension
- Try different content types (articles, videos, todos, etc.)
- Experiment with natural language search
- Customize the UI to your liking

## Need Help?

Check the main README.md for:
- Detailed architecture
- API documentation
- Troubleshooting guide
- Production deployment tips

Happy knowledge management! 🧠✨
