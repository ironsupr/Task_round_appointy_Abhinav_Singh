const API_URL = 'http://localhost:8000';

let selectedContentType = 'note';
let currentPageData = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
  await loadPageData();
});

function setupEventListeners() {
  // Auth toggle
  document.getElementById('showRegister').addEventListener('click', () => {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    clearMessage();
  });

  document.getElementById('showLogin').addEventListener('click', () => {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    clearMessage();
  });

  // Auth buttons
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Content type selection
  document.querySelectorAll('.content-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.content-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedContentType = btn.dataset.type;
    });
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', handleSave);

  // Open dashboard
  document.getElementById('openDashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // Enter key handlers
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('registerPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
}

async function checkAuth() {
  const token = await getToken();

  if (token) {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        showCaptureSection(user);
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  showAuthSection();
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      await saveToken(data.access_token);
      showMessage('Login successful!', 'success');
      setTimeout(() => checkAuth(), 500);
    } else {
      showMessage(data.detail || 'Login failed', 'error');
    }
  } catch (error) {
    showMessage('Connection error. Is the backend running?', 'error');
  } finally {
    showLoading(false);
  }
}

async function handleRegister() {
  const email = document.getElementById('registerEmail').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!email || !username || !password) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password })
    });

    const data = await response.json();

    if (response.ok) {
      await saveToken(data.access_token);
      showMessage('Registration successful!', 'success');
      setTimeout(() => checkAuth(), 500);
    } else {
      showMessage(data.detail || 'Registration failed', 'error');
    }
  } catch (error) {
    showMessage('Connection error. Is the backend running?', 'error');
  } finally {
    showLoading(false);
  }
}

async function handleLogout() {
  await chrome.storage.local.remove('synapse_token');
  showAuthSection();
}

async function loadPageData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    currentPageData = {
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl || ''
    };

    document.getElementById('pageTitle').textContent = currentPageData.title;
    document.getElementById('pageUrl').textContent = currentPageData.url;

    // Auto-detect content type
    autoDetectContentType(currentPageData.url);

  } catch (error) {
    console.error('Error loading page data:', error);
  }
}

function autoDetectContentType(url) {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com')) {
    selectContentType('video');
  } else if (urlLower.includes('amazon.com') || urlLower.includes('shop') || urlLower.includes('product')) {
    selectContentType('product');
  } else if (urlLower.includes('medium.com') || urlLower.includes('blog') || urlLower.includes('article')) {
    selectContentType('article');
  }
}

function selectContentType(type) {
  document.querySelectorAll('.content-type-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-type="${type}"]`);
  if (btn) {
    btn.classList.add('active');
    selectedContentType = type;
  }
}

async function handleSave() {
  const token = await getToken();
  if (!token) {
    showMessage('Please login first', 'error', 'message2');
    return;
  }

  showLoading(true);

  try {
    // Get page content from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });

    const pageContent = results[0].result;

    // Prepare content data based on type
    const contentData = {
      content_type: selectedContentType,
      title: currentPageData.title,
      raw_data: pageContent.text || currentPageData.title,
      source_url: currentPageData.url,
      metadata: {
        domain: new URL(currentPageData.url).hostname,
        savedAt: new Date().toISOString()
      }
    };

    // Add type-specific metadata
    if (selectedContentType === 'video' && currentPageData.url.includes('youtube.com')) {
      const videoId = extractYouTubeId(currentPageData.url);
      if (videoId) {
        contentData.metadata.videoId = videoId;
        contentData.metadata.embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Save to API
    const response = await fetch(`${API_URL}/api/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(contentData)
    });

    if (response.ok) {
      showMessage('Saved to Synapse!', 'success', 'message2');
      setTimeout(() => {
        clearMessage('message2');
      }, 2000);
    } else {
      showMessage('Failed to save content', 'error', 'message2');
    }
  } catch (error) {
    console.error('Save error:', error);
    showMessage('Error saving content', 'error', 'message2');
  } finally {
    showLoading(false);
  }
}

// Function to inject into page
function extractPageContent() {
  const selectedText = window.getSelection().toString();

  if (selectedText) {
    return { text: selectedText };
  }

  // Try to get article content
  const article = document.querySelector('article');
  if (article) {
    return { text: article.innerText.substring(0, 5000) };
  }

  // Try to get main content
  const main = document.querySelector('main');
  if (main) {
    return { text: main.innerText.substring(0, 5000) };
  }

  // Fallback to body
  const bodyText = document.body.innerText.substring(0, 5000);
  return { text: bodyText };
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

function showAuthSection() {
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('captureSection').classList.add('hidden');
}

function showCaptureSection(user) {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('captureSection').classList.remove('hidden');
  document.getElementById('currentUser').textContent = user.username;
}

function showMessage(msg, type, elementId = 'message') {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = msg;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function clearMessage(elementId = 'message') {
  const messageEl = document.getElementById(elementId);
  messageEl.style.display = 'none';
  messageEl.textContent = '';
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('authSection').style.display = show ? 'none' : (document.getElementById('authSection').classList.contains('hidden') ? 'none' : 'block');
  document.getElementById('captureSection').style.display = show ? 'none' : (document.getElementById('captureSection').classList.contains('hidden') ? 'none' : 'block');
}

async function saveToken(token) {
  await chrome.storage.local.set({ 'synapse_token': token });
}

async function getToken() {
  const result = await chrome.storage.local.get('synapse_token');
  return result.synapse_token;
}
