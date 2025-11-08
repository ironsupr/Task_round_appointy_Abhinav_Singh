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

    // Check if we can inject into this tab
    if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showMessage('Cannot save from this page type', 'error', 'message2');
      showLoading(false);
      return;
    }

    // Execute the enhanced extraction function inline
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract basic content
        function getPageContent() {
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

        // Extract price from page
        function extractPrice() {
          const pricePatterns = [
            /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
            /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
            /€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
            /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
          ];

          // Check common price elements
          const priceSelectors = [
            '.price', '.product-price', '.price-now', '.sale-price',
            '[class*="price"]', '[id*="price"]', 'span[itemprop="price"]',
            'meta[property="product:price:amount"]', 'meta[itemprop="price"]'
          ];

          for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent || element.content || '';
              for (const pattern of pricePatterns) {
                const match = text.match(pattern);
                if (match) {
                  return parseFloat(match[1].replace(/,/g, ''));
                }
              }
            }
          }

          // Fallback: search in body text
          const bodyText = document.body.innerText;
          for (const pattern of pricePatterns) {
            const match = bodyText.match(pattern);
            if (match) {
              return parseFloat(match[1].replace(/,/g, ''));
            }
          }

          return null;
        }

        // Extract product image
        function extractProductImage() {
          // Check Open Graph image
          const ogImage = document.querySelector('meta[property="og:image"]');
          if (ogImage && ogImage.content) {
            return ogImage.content;
          }

          // Check common product image selectors
          const imageSelectors = [
            '.product-image img', '.product-photo img',
            '[class*="product"] img', '[id*="product"] img',
            'img[itemprop="image"]', '.gallery img', '.main-image img'
          ];

          for (const selector of imageSelectors) {
            const img = document.querySelector(selector);
            if (img && img.src && !img.src.includes('placeholder')) {
              return img.src;
            }
          }

          // Find largest image on page (likely product image)
          const images = Array.from(document.querySelectorAll('img'));
          let largestImage = null;
          let largestSize = 0;

          for (const img of images) {
            if (img.naturalWidth && img.naturalHeight) {
              const size = img.naturalWidth * img.naturalHeight;
              if (size > largestSize && size > 10000 && !img.src.includes('logo')) {
                largestSize = size;
                largestImage = img.src;
              }
            }
          }

          return largestImage;
        }

        // Extract seller/brand information
        function extractSeller() {
          // Check for brand/seller in structured data
          const brandSelectors = [
            'meta[property="product:brand"]',
            'meta[itemprop="brand"]',
            '[itemprop="manufacturer"]',
            '.brand', '.seller', '.vendor',
            '[class*="brand"]', '[class*="seller"]'
          ];

          for (const selector of brandSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent || element.content || '';
              if (text.trim()) {
                return text.trim();
              }
            }
          }

          // Amazon specific
          if (window.location.hostname.includes('amazon')) {
            const byLine = document.querySelector('#bylineInfo');
            if (byLine) {
              return byLine.textContent.replace('Visit the', '').replace('Store', '').trim();
            }
          }

          return null;
        }

        // Extract product rating
        function extractRating() {
          const ratingSelectors = [
            '[class*="rating"]', '[class*="stars"]',
            '[itemprop="ratingValue"]', '.review-rating',
            'meta[itemprop="ratingValue"]'
          ];

          for (const selector of ratingSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent || element.content || '';
              const match = text.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                const rating = parseFloat(match[1]);
                if (rating <= 5) {
                  return rating;
                }
              }
            }
          }

          return null;
        }

        // Main extraction logic
        const baseContent = getPageContent();
        const contentType = window.location.href.includes('product') ||
                           window.location.href.includes('shop') ||
                           window.location.href.includes('amazon') ? 'product' : null;

        const enhancedData = {
          ...baseContent,
          metadata: {}
        };

        if (contentType === 'product') {
          enhancedData.metadata = {
            price: extractPrice(),
            image: extractProductImage(),
            seller: extractSeller(),
            rating: extractRating()
          };
        }

        return enhancedData;
      }
    });

    const pageContent = results[0].result;

    // Log extracted content for debugging
    console.log('Extracted page content:', pageContent);

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

    console.log('Content data to save:', contentData);

    // Add type-specific metadata
    if (selectedContentType === 'product' && pageContent.metadata) {
      // Merge extracted product metadata
      contentData.metadata = {
        ...contentData.metadata,
        ...pageContent.metadata
      };
    }

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
      const errorText = await response.text();
      console.error('Save failed:', response.status, errorText);

      if (response.status === 401) {
        showMessage('Session expired. Please login again.', 'error', 'message2');
        // Clear invalid token
        await chrome.storage.local.remove('synapse_token');
        setTimeout(() => checkAuth(), 1500);
      } else if (response.status === 422) {
        showMessage('Invalid data format. Please try again.', 'error', 'message2');
      } else {
        showMessage(`Failed to save: ${response.status}`, 'error', 'message2');
      }
    }
  } catch (error) {
    console.error('Save error:', error);

    // More specific error messages
    if (error.message.includes('Failed to fetch')) {
      showMessage('Cannot connect to server. Is it running?', 'error', 'message2');
    } else if (error.message.includes('NetworkError')) {
      showMessage('Network error. Check your connection.', 'error', 'message2');
    } else {
      showMessage(`Error: ${error.message}`, 'error', 'message2');
    }
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

// Extract price from page
function extractPrice() {
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
  ];

  // Check common price elements
  const priceSelectors = [
    '.price', '.product-price', '.price-now', '.sale-price',
    '[class*="price"]', '[id*="price"]', 'span[itemprop="price"]',
    'meta[property="product:price:amount"]', 'meta[itemprop="price"]'
  ];

  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent || element.content || '';
      for (const pattern of pricePatterns) {
        const match = text.match(pattern);
        if (match) {
          return parseFloat(match[1].replace(/,/g, ''));
        }
      }
    }
  }

  // Fallback: search in body text
  const bodyText = document.body.innerText;
  for (const pattern of pricePatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }

  return null;
}

// Extract product image
function extractProductImage() {
  // Check Open Graph image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content) {
    return ogImage.content;
  }

  // Check common product image selectors
  const imageSelectors = [
    '.product-image img', '.product-photo img',
    '[class*="product"] img', '[id*="product"] img',
    'img[itemprop="image"]', '.gallery img', '.main-image img'
  ];

  for (const selector of imageSelectors) {
    const img = document.querySelector(selector);
    if (img && img.src && !img.src.includes('placeholder')) {
      return img.src;
    }
  }

  // Find largest image on page (likely product image)
  const images = Array.from(document.querySelectorAll('img'));
  let largestImage = null;
  let largestSize = 0;

  for (const img of images) {
    if (img.naturalWidth && img.naturalHeight) {
      const size = img.naturalWidth * img.naturalHeight;
      if (size > largestSize && size > 10000 && !img.src.includes('logo')) {
        largestSize = size;
        largestImage = img.src;
      }
    }
  }

  return largestImage;
}

// Extract seller/brand information
function extractSeller() {
  // Check for brand/seller in structured data
  const brandSelectors = [
    'meta[property="product:brand"]',
    'meta[itemprop="brand"]',
    '[itemprop="manufacturer"]',
    '.brand', '.seller', '.vendor',
    '[class*="brand"]', '[class*="seller"]'
  ];

  for (const selector of brandSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent || element.content || '';
      if (text.trim()) {
        return text.trim();
      }
    }
  }

  // Amazon specific
  if (window.location.hostname.includes('amazon')) {
    const byLine = document.querySelector('#bylineInfo');
    if (byLine) {
      return byLine.textContent.replace('Visit the', '').replace('Store', '').trim();
    }
  }

  return null;
}

// Extract product rating
function extractRating() {
  const ratingSelectors = [
    '[class*="rating"]', '[class*="stars"]',
    '[itemprop="ratingValue"]', '.review-rating',
    'meta[itemprop="ratingValue"]'
  ];

  for (const selector of ratingSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent || element.content || '';
      const match = text.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const rating = parseFloat(match[1]);
        if (rating <= 5) {
          return rating;
        }
      }
    }
  }

  return null;
}

// Enhanced content extraction function
function extractEnhancedPageContent() {
  const baseContent = extractPageContent();
  const contentType = window.location.href.includes('product') ||
                     window.location.href.includes('shop') ||
                     window.location.href.includes('amazon') ? 'product' : null;

  const enhancedData = {
    ...baseContent,
    metadata: {}
  };

  if (contentType === 'product') {
    enhancedData.metadata = {
      price: extractPrice(),
      image: extractProductImage(),
      seller: extractSeller(),
      rating: extractRating()
    };
  }

  return enhancedData;
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
