// Content script for Synapse extension
console.log('Synapse content script loaded');

// Global variables
let selectionPopup = null;
let selectedText = '';
let isInitialized = false;

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded
  init();
}

function init() {
  // Prevent multiple initializations
  if (isInitialized) return;
  isInitialized = true;

  // Skip initialization on certain pages
  if (document.contentType && !document.contentType.includes('html')) {
    console.log('Synapse: Skipping initialization for non-HTML content');
    return;
  }

  // Skip on chrome:// pages and other restricted URLs
  if (window.location.protocol === 'chrome:' ||
      window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'about:') {
    console.log('Synapse: Skipping initialization on restricted page');
    return;
  }

  // Create selection popup element
  createSelectionPopup();

  // Add text selection listener
  document.addEventListener('mouseup', handleTextSelection);

  // Add keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Hide popup when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.synapse-selection-popup')) {
      hideSelectionPopup();
    }
  });
}

// Create the selection popup element
function createSelectionPopup() {
  // Remove if already exists
  if (selectionPopup) {
    selectionPopup.remove();
  }

  // Create popup container
  selectionPopup = document.createElement('div');
  selectionPopup.className = 'synapse-selection-popup';
  selectionPopup.innerHTML = `
    <button data-type="note" title="Save as Note">📝</button>
    <button data-type="todo" title="Save as Todo">✅</button>
    <button data-type="quote" title="Save as Quote">💬</button>
  `;

  // Add click handlers
  selectionPopup.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const contentType = btn.dataset.type;
      saveSelectedText(contentType);
    });
  });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .synapse-selection-popup {
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: none;
      flex-direction: row;
      gap: 4px;
    }

    .synapse-selection-popup button {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
    }

    .synapse-selection-popup button:hover {
      background: #f5f5f5;
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .synapse-selection-popup button:active {
      transform: translateY(0);
    }

    @keyframes synapsePopIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .synapse-selection-popup.show {
      display: flex;
      animation: synapsePopIn 0.2s ease;
    }
  `;

  // Only add style if it doesn't exist
  if (!document.querySelector('style[data-synapse-styles]')) {
    style.setAttribute('data-synapse-styles', 'true');
    document.head.appendChild(style);
  }

  document.body.appendChild(selectionPopup);
}

// Handle text selection
function handleTextSelection(e) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();

  // Show popup if text is selected (minimum 3 characters)
  if (selectedText.length > 2) {
    // Don't show popup if clicking on our own popup
    if (e.target.closest('.synapse-selection-popup')) {
      return;
    }

    showSelectionPopup(e.pageX, e.pageY);
  } else {
    hideSelectionPopup();
  }
}

// Show the selection popup near the cursor
function showSelectionPopup(x, y) {
  if (!selectionPopup) {
    createSelectionPopup();
  }

  // Position the popup
  const popupWidth = 150;
  const popupHeight = 56;
  const padding = 10;

  // Ensure popup stays within viewport
  let left = x - (popupWidth / 2);
  let top = y - popupHeight - padding;

  // Adjust if too close to edges
  if (left < padding) left = padding;
  if (left + popupWidth > window.innerWidth - padding) {
    left = window.innerWidth - popupWidth - padding;
  }

  // Show above or below selection based on position
  if (top < padding) {
    top = y + padding; // Show below if too close to top
  }

  selectionPopup.style.left = `${left}px`;
  selectionPopup.style.top = `${top}px`;
  selectionPopup.classList.add('show');
}

// Hide the selection popup
function hideSelectionPopup() {
  if (selectionPopup) {
    selectionPopup.classList.remove('show');
  }
}

// Save selected text to Synapse
async function saveSelectedText(contentType) {
  try {
    // Get auth token
    const tokenResult = await chrome.storage.local.get('synapse_token');
    const token = tokenResult.synapse_token;

    if (!token) {
      alert('Please login to Synapse first! Click the extension icon to login.');
      return;
    }

    // Prepare content data
    const contentData = {
      content_type: contentType,
      title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} from ${document.title}`,
      raw_data: selectedText,
      source_url: window.location.href,
      metadata: {
        domain: new URL(window.location.href).hostname,
        savedAt: new Date().toISOString(),
        method: 'text_selection'
      }
    };

    const response = await fetch('http://localhost:8000/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(contentData)
    });

    if (response.ok) {
      showNotification(`✓ Saved as ${contentType}!`);
      hideSelectionPopup();
      window.getSelection().removeAllRanges();
    } else if (response.status === 401) {
      showNotification('Session expired. Please login again.', 'error');
      chrome.storage.local.remove('synapse_token');
    } else {
      showNotification('Failed to save. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Save error:', error);
    if (error.message.includes('Failed to fetch')) {
      showNotification('Cannot connect to Synapse. Is the backend running?', 'error');
    } else {
      showNotification('Error saving content.', 'error');
    }
  }
}

// Show notification
function showNotification(message, type = 'success') {
  // Remove existing notifications
  document.querySelectorAll('.synapse-notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `synapse-notification ${type}`;
  notification.textContent = message;

  const style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10001;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;

  notification.style.cssText = style;

  // Add animation style if not exists
  if (!document.querySelector('style[data-synapse-notification]')) {
    const animStyle = document.createElement('style');
    animStyle.setAttribute('data-synapse-notification', 'true');
    animStyle.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(animStyle);
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + Shift + S to save selection
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    const selection = window.getSelection().toString().trim();
    if (selection.length > 2) {
      selectedText = selection;
      saveSelectedText('note'); // Default to note
    } else {
      showNotification('Please select some text first', 'error');
    }
  }

  // Ctrl/Cmd + / to show command palette
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    showCommandPalette();
  }
}

// Show command palette
function showCommandPalette() {
  // Remove existing palette
  const existingPalette = document.getElementById('synapse-command-palette');
  if (existingPalette) {
    existingPalette.remove();
  }

  const palette = document.createElement('div');
  palette.id = 'synapse-command-palette';
  palette.innerHTML = `
    <div class="synapse-palette-overlay"></div>
    <div class="synapse-palette-container">
      <input type="text" placeholder="Type a command..." class="synapse-palette-input">
      <div class="synapse-palette-commands">
        <div class="synapse-command" data-action="save-page">Save entire page</div>
        <div class="synapse-command" data-action="save-selection">Save selection</div>
        <div class="synapse-command" data-action="open-dashboard">Open dashboard</div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.setAttribute('data-synapse-palette', 'true');
  style.textContent = `
    #synapse-command-palette {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10002;
      display: block;
      animation: fadeIn 0.2s ease;
    }

    .synapse-palette-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
    }

    .synapse-palette-container {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      max-width: 90%;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    .synapse-palette-input {
      width: 100%;
      padding: 16px 20px;
      border: none;
      border-bottom: 1px solid #e0e0e0;
      font-size: 16px;
      outline: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .synapse-palette-commands {
      max-height: 300px;
      overflow-y: auto;
    }

    .synapse-command {
      padding: 12px 20px;
      cursor: pointer;
      transition: background 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    .synapse-command:hover {
      background: #f5f5f5;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  if (!document.querySelector('style[data-synapse-palette]')) {
    document.head.appendChild(style);
  }

  document.body.appendChild(palette);

  // Add event listeners
  palette.querySelector('.synapse-palette-overlay').addEventListener('click', () => {
    palette.remove();
  });

  palette.querySelectorAll('.synapse-command').forEach(cmd => {
    cmd.addEventListener('click', () => {
      executeCommand(cmd.dataset.action);
      palette.remove();
    });
  });

  // Filter commands on input
  const input = palette.querySelector('.synapse-palette-input');
  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    palette.querySelectorAll('.synapse-command').forEach(cmd => {
      const text = cmd.textContent.toLowerCase();
      cmd.style.display = text.includes(query) ? 'block' : 'none';
    });
  });

  // Focus input
  input.focus();

  // Close on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      palette.remove();
    }
  });
}

// Execute command from palette
function executeCommand(action) {
  switch(action) {
    case 'save-page':
      // Open popup to save the entire page
      chrome.runtime.sendMessage({ action: 'openPopup' });
      break;
    case 'save-selection':
      const selection = window.getSelection().toString().trim();
      if (selection) {
        selectedText = selection;
        saveSelectedText('note');
      } else {
        showNotification('Please select some text first', 'error');
      }
      break;
    case 'open-dashboard':
      window.open('http://localhost:3000', '_blank');
      break;
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = extractContent();
    sendResponse(content);
  }
  return true; // Keep the message channel open for async response
});

function extractContent() {
  return {
    title: document.title,
    url: window.location.href,
    selectedText: window.getSelection().toString(),
    mainContent: getMainContent()
  };
}

function getMainContent() {
  // Try to find main content
  const article = document.querySelector('article');
  if (article) {
    return article.innerText.substring(0, 5000);
  }

  const main = document.querySelector('main');
  if (main) {
    return main.innerText.substring(0, 5000);
  }

  return document.body.innerText.substring(0, 5000);
}