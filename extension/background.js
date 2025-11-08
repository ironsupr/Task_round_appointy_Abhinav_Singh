// Background service worker for Synapse extension

console.log('Synapse background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Synapse extension installed');

  // Set up context menu
  chrome.contextMenus.create({
    id: 'save-to-synapse',
    title: 'Save to Synapse',
    contexts: ['selection', 'page', 'link', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-synapse') {
    // Open the popup to save content
    chrome.action.openPopup();
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveContent') {
    // Handle content saving if needed
    console.log('Save content request:', request.data);
    sendResponse({ success: true });
  } else if (request.action === 'openPopup') {
    // Open the extension popup
    chrome.action.openPopup();
    sendResponse({ success: true });
  } else if (request.action === 'captureScreenshot') {
    // Capture visible tab screenshot
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // Keep channel open for async response
  }

  return true; // Keep message channel open
});

// Handle keyboard shortcuts (if defined in manifest)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-page') {
    chrome.action.openPopup();
  }
});