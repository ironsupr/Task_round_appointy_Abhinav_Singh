// Content script for Synapse extension
// This runs on every page and can be used for future features like:
// - In-page save buttons
// - Text selection popups
// - Auto-detection of content types

console.log('Synapse content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = extractContent();
    sendResponse(content);
  }
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
