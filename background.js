// Initialize storage with empty filters if none exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['filters'], (result) => {
    if (!result.filters) {
      chrome.storage.sync.set({ filters: [] });
    }
  });
});

// Handle keep-alive messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'keepAlive') {
    // Just responding keeps the service worker alive
    sendResponse({status: 'alive'});
  }
});
