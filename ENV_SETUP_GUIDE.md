# Environment Variables Setup Guide

## Quick Setup (3 minutes)

### Step 1: Create your `.env` file

```bash
cd backend
copy .env.example .env
```

Or manually create a file named `.env` in the `backend` folder.

### Step 2: Edit the `.env` file

Open `backend/.env` in any text editor and configure the following values:

---

## Required Environment Variables

### 1. **ANTHROPIC_API_KEY** (REQUIRED)

**What it is:** Your API key for accessing Claude AI

**How to get it:**

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in with your account
3. Navigate to **API Keys** section
4. Click **"Create Key"**
5. Copy the generated key (starts with `sk-ant-`)

**Example:**
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- ⚠️ This is the **ONLY required value** you must obtain externally
- Keep this key secret (never commit to Git)
- Free tier includes $5 credit (enough for testing)
- Production usage requires a paid account

**Pricing (as of 2025):**
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens
- Estimate: ~$0.01-0.05 per search query

---

### 2. **SECRET_KEY** (REQUIRED - Change Default)

**What it is:** Secret key for JWT token encryption

**How to get it:** Generate a random string

**Option A - Python (Recommended):**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B - Online Generator:**
- Go to [https://randomkeygen.com/](https://randomkeygen.com/)
- Copy any "CodeIgniter Encryption Key" or similar

**Option C - Manual:**
- Just type a long random string (at least 32 characters)

**Example:**
```env
SECRET_KEY=x8f9Ks2mP4nQ7tYvB1cE5gH9jK3lM6oR8sT2uW5xZ1aD4fG7
```

**Important:**
- ⚠️ **MUST be changed from default** for security
- Use different keys for development and production
- Never share or commit this key

---

### 3. **DATABASE_URL** (Auto-configured)

**What it is:** Database connection string

**Default value (SQLite):**
```env
DATABASE_URL=sqlite:///./synapse.db
```

**You can keep this as-is for MVP.**

**For production, use PostgreSQL:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/synapse
```

---

### 4. **ALGORITHM** (Keep default)

**What it is:** JWT encryption algorithm

**Default value:**
```env
ALGORITHM=HS256
```

**You can keep this as-is.**

---

### 5. **ACCESS_TOKEN_EXPIRE_MINUTES** (Optional)

**What it is:** How long JWT tokens remain valid (in minutes)

**Default value:**
```env
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

This is 7 days (10080 minutes).

**Options:**
- `60` = 1 hour (very secure, frequent re-login)
- `1440` = 1 day
- `10080` = 7 days (default, good for development)
- `43200` = 30 days (convenient but less secure)

**You can keep the default or adjust based on your needs.**

---

## Complete `.env` File Example

Here's what your final `.env` file should look like:

```env
# Database Configuration
DATABASE_URL=sqlite:///./synapse.db

# Security Configuration
SECRET_KEY=x8f9Ks2mP4nQ7tYvB1cE5gH9jK3lM6oR8sT2uW5xZ1aD4fG7
ALGORITHM=HS256

# JWT Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI Service Configuration (REQUIRED - Get from Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Verification Checklist

Before running the backend, verify:

- [ ] `.env` file exists in `backend/` folder (not in root)
- [ ] `ANTHROPIC_API_KEY` is filled with your actual API key
- [ ] `SECRET_KEY` is changed from default
- [ ] No quotes around values (FastAPI reads them directly)
- [ ] File is named exactly `.env` (not `.env.txt`)

---

## Testing Your Configuration

### Test 1: Check if .env is loaded

```bash
cd backend
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('API Key loaded:', bool(os.getenv('ANTHROPIC_API_KEY')))"
```

Expected output: `API Key loaded: True`

### Test 2: Run the backend

```bash
cd backend
python main.py
```

Expected output:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test 3: Check API is working

Open browser: [http://localhost:8000](http://localhost:8000)

Expected response:
```json
{"message": "Synapse API is running", "version": "1.0.0"}
```

### Test 4: Run test suite

```bash
cd backend
python test_api.py
```

This will test all endpoints including authentication and AI features.

---

## Common Issues & Solutions

### Issue 1: "ANTHROPIC_API_KEY not found"

**Problem:** Environment variable not loaded

**Solutions:**
1. Make sure `.env` file is in `backend/` folder (not root)
2. Check file name is exactly `.env` (not `.env.txt`)
3. Restart your terminal/command prompt
4. Try setting it manually:
   ```bash
   # Windows (PowerShell)
   $env:ANTHROPIC_API_KEY="your-key-here"

   # Windows (CMD)
   set ANTHROPIC_API_KEY=your-key-here

   # Mac/Linux
   export ANTHROPIC_API_KEY=your-key-here
   ```

### Issue 2: "Invalid API Key"

**Problem:** API key is incorrect or expired

**Solutions:**
1. Go back to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Check if the key is active
3. Generate a new key if needed
4. Make sure you copied the entire key (starts with `sk-ant-`)

### Issue 3: "Secret key too short"

**Problem:** SECRET_KEY is not secure enough

**Solutions:**
1. Generate a new key using Python:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
2. Use at least 32 characters

### Issue 4: Backend starts but search doesn't work

**Problem:** API key is set but may have insufficient credits

**Solutions:**
1. Check your Anthropic account balance at [https://console.anthropic.com/](https://console.anthropic.com/)
2. Add payment method if free credits are exhausted
3. Check API logs in terminal for error messages

---

## Getting Anthropic API Key (Detailed Steps)

### Step-by-Step Guide with Screenshots

**1. Go to Anthropic Console**
- Visit: [https://console.anthropic.com/](https://console.anthropic.com/)

**2. Sign Up / Log In**
- Click "Sign Up" if you don't have an account
- Use Google, GitHub, or email to sign up
- Verify your email if required

**3. Navigate to API Keys**
- Once logged in, look for "API Keys" in the left sidebar
- Or go directly to: [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

**4. Create New Key**
- Click "Create Key" button
- Give it a name (e.g., "Synapse Development")
- Click "Create Key"

**5. Copy the Key**
- **IMPORTANT:** Copy the key immediately (you won't see it again!)
- It looks like: `sk-ant-api03-xxxxxxxxxxxxxx`
- Paste it into your `.env` file

**6. Check Your Credits**
- Go to "Billing" or "Usage" section
- New accounts get $5 free credit
- This is enough for ~500-1000 search queries

---

## Security Best Practices

### ✅ DO:
- Keep `.env` file in `.gitignore` (already configured)
- Use different API keys for development and production
- Rotate your SECRET_KEY periodically
- Use environment-specific values

### ❌ DON'T:
- Commit `.env` file to Git
- Share your API keys publicly
- Use production keys in development
- Hardcode secrets in source code

---

## Production Deployment

When deploying to production (Heroku, Railway, AWS, etc.):

**Don't use `.env` files!**

Instead, set environment variables through the platform:

**Heroku:**
```bash
heroku config:set ANTHROPIC_API_KEY=sk-ant-api03-xxx
heroku config:set SECRET_KEY=your-secret-key
```

**Railway:**
- Go to project settings → Variables
- Add each variable there

**Docker:**
```bash
docker run -e ANTHROPIC_API_KEY=sk-ant-xxx -e SECRET_KEY=xxx synapse
```

**AWS/DigitalOcean:**
- Use AWS Secrets Manager or similar service
- Never hardcode in EC2 user data

---

## Cost Estimation

Based on Claude API pricing:

| Usage Level | Queries/Day | Cost/Month | Notes |
|-------------|-------------|------------|-------|
| Testing | 10-50 | ~$1-5 | Free tier covers this |
| Light Use | 100-500 | ~$10-50 | Small team/personal |
| Medium Use | 1000-5000 | ~$100-500 | Small business |
| Heavy Use | 10000+ | $1000+ | Consider optimization |

**Free tier:** $5 credit covers ~500-1000 queries

---

## Quick Start Command

For the impatient:

```bash
# 1. Generate SECRET_KEY
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))" > backend/.env

# 2. Add other values
echo DATABASE_URL=sqlite:///./synapse.db >> backend/.env
echo ALGORITHM=HS256 >> backend/.env
echo ACCESS_TOKEN_EXPIRE_MINUTES=10080 >> backend/.env
echo ANTHROPIC_API_KEY=your-key-here >> backend/.env

# 3. Edit the file and replace "your-key-here" with your actual Anthropic API key
notepad backend/.env
```

---

## Need Help?

If you're stuck:

1. Check `QUICK_START.md` for setup instructions
2. Check `README.md` for troubleshooting
3. Run `python test_api.py` to diagnose issues
4. Check backend logs when running `python main.py`

**Still stuck?** Make sure:
- Python 3.8+ is installed
- You're in the `backend` folder when running commands
- `.env` file has no syntax errors (no quotes needed)
- Your Anthropic API key is active and has credits
