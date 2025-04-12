document.addEventListener('DOMContentLoaded', function() {
  // Get all toggle elements
  const blockAdsToggle = document.getElementById('blockAds');
  const hideShortsToggle = document.getElementById('hideShorts');
  const focusModeToggle = document.getElementById('focusMode');
  const autoSkipIntrosToggle = document.getElementById('autoSkipIntros');
  const distractionFreeToggle = document.getElementById('distractionFree');
  
  // Load saved settings
  chrome.storage.sync.get({
    blockAds: true,
    hideShorts: true,
    focusMode: false,
    autoSkipIntros: false,
    distractionFree: false
  }, function(settings) {
    blockAdsToggle.checked = settings.blockAds;
    hideShortsToggle.checked = settings.hideShorts;
    focusModeToggle.checked = settings.focusMode;
    autoSkipIntrosToggle.checked = settings.autoSkipIntros;
    distractionFreeToggle.checked = settings.distractionFree;
  });
  
  // Save settings when toggles change
  blockAdsToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ blockAds: this.checked });
    notifyContentScript();
  });
  
  hideShortsToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ hideShorts: this.checked });
    notifyContentScript();
  });
  
  focusModeToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ focusMode: this.checked });
    notifyContentScript();
  });
  
  autoSkipIntrosToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ autoSkipIntros: this.checked });
    notifyContentScript();
  });
  
  distractionFreeToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ distractionFree: this.checked });
    notifyContentScript();
  });
  
  // Function to notify content script of setting changes
  function notifyContentScript() {
    chrome.tabs.query({url: '*://*.youtube.com/*'}, function(tabs) {
      if (tabs.length > 0) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' });
        });
      }
    });
  }
});