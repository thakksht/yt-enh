// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      blockAds: true,
      hideShorts: true,
      autoSkipIntros: false,
      distractionFree: false
    });
  }
});

// Listen for tab updates to inject our script when YouTube is loaded
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    // Send a message to content script to refresh settings
    chrome.tabs.sendMessage(tabId, { action: 'settingsUpdated' });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, function(settings) {
      sendResponse(settings);
    });
    return true; // Required for async sendResponse
  }
});