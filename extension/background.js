// Background service worker for Synapse extension

console.log('Synapse background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Synapse extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveContent') {
    // Handle content saving if needed
    console.log('Save content request:', request.data);
  }
});
