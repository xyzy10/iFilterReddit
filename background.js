// Initialize storage with empty filters if none exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['filters'], (result) => {
    if (!result.filters) {
      chrome.storage.sync.set({ filters: [] });
    }
  });
});
