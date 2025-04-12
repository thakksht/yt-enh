// Initial settings
let settings = {
  blockAds: true,
  hideShorts: true,
  focusMode: false,
  autoSkipIntros: false,
  distractionFree: false
};

// Load settings when content script initializes
chrome.storage.sync.get({
  blockAds: true,
  hideShorts: true,
  focusMode: false,
  autoSkipIntros: false,
  distractionFree: false
}, function(loadedSettings) {
  settings = loadedSettings;
  applySettings();
});

// Listen for settings changes
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'settingsUpdated') {
    chrome.storage.sync.get(settings, function(updatedSettings) {
      settings = updatedSettings;
      applySettings();
    });
  }
  return true;
});

// Main function to apply all settings
function applySettings() {
  if (settings.blockAds) {
    blockAds();
  }
  
  if (settings.hideShorts) {
    hideShorts();
  }
  
  if (settings.focusMode) {
    enableFocusMode();
  } else {
    disableFocusMode();
  }
  
  if (settings.autoSkipIntros) {
    setupAutoSkipIntros();
  }
  
  if (settings.distractionFree) {
    enableDistractionFreeMode();
  } else {
    disableDistractionFreeMode();
  }
}

// Observer to monitor DOM changes for ads and shorts
const observer = new MutationObserver(function(mutations) {
  if (settings.blockAds) {
    blockAds();
  }
  
  if (settings.hideShorts) {
    hideShorts();
  }
  
  if (settings.focusMode) {
    enableFocusMode();
  }
  
  if (settings.autoSkipIntros) {
    checkForSkipButtons();
  }
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Function to block ads
function blockAds() {
  // Video page ads
  const adElements = document.querySelectorAll('.ad-showing, .ytp-ad-module');
  adElements.forEach(ad => {
    const video = document.querySelector('video');
    if (video && ad) {
      // Skip ad by moving to the end
      video.currentTime = video.duration;
      // Click skip button if available
      const skipButton = document.querySelector('.ytp-ad-skip-button');
      if (skipButton) {
        skipButton.click();
      }
    }
  });
  
  // Homepage/sidebar ads
  const promotedContent = document.querySelectorAll('ytd-promoted-video-renderer, ytd-display-ad-renderer, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer');
  promotedContent.forEach(ad => {
    ad.style.display = 'none';
  });
}

// Function to hide shorts from feed
function hideShorts() {
  // Hide shorts in feed and recommendations
  const shortItems = document.querySelectorAll('ytd-rich-item-renderer:has(a[href^="/shorts/"]), ytd-grid-video-renderer:has(a[href^="/shorts/"]), ytd-compact-video-renderer:has(a[href^="/shorts/"])');
  shortItems.forEach(item => {
    item.style.display = 'none';
  });
  
  // Hide the shorts tab in navigation
  const shortsTab = document.querySelector('ytd-guide-entry-renderer:has(a[title="Shorts"])');
  if (shortsTab) {
    shortsTab.style.display = 'none';
  }
}

// Function for Focus Mode - transforms homepage to focus on search
function enableFocusMode() {
  // Only apply on homepage
  if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
    // Create and append stylesheet if it doesn't exist
    let style = document.getElementById('yt-enhancer-focus-mode');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yt-enhancer-focus-mode';
      document.head.appendChild(style);
    }
    
    // CSS to hide recommendations and emphasize search
    style.textContent = `
      /* Hide all recommendation content */
      ytd-rich-grid-renderer,
      ytd-two-column-browse-results-renderer,
      ytd-browse,
      ytd-section-list-renderer,
      #primary > ytd-rich-grid-renderer,
      #contents.ytd-rich-grid-renderer {
        display: none !important;
      }
      
      /* Create a clean search-focused interface */
      #masthead-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        max-width: 800px;
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      /* Make search bar prominent */
      #search-container, #search, #search-form {
        width: 100% !important;
        max-width: 800px !important;
      }
      
      /* Increase search bar size */
      #search-input #search {
        height: 60px !important;
        font-size: 20px !important;
        border-radius: 30px !important;
        background-color: white !important;
        border: 2px solid #cc0000 !important;
        padding: 0 20px !important;
      }
      
      /* Style search button */
      #search-icon-legacy {
        height: 60px !important;
        width: 60px !important;
        border-radius: 0 30px 30px 0 !important;
        background-color: #cc0000 !important;
      }
      
      /* Add a clean focus mode message */
      body::before {
        content: "Focus Mode - Search for what you want to learn";
        display: block;
        position: fixed;
        top: 35%;
        left: 0;
        width: 100%;
        text-align: center;
        font-size: 24px;
        color: #cc0000;
        font-weight: bold;
      }
      
      /* Hide guide menu when in focus mode */
      #guide-inner-content, 
      tp-yt-app-drawer {
        display: none !important;
      }
      
      /* Only keep essential header elements */
      .ytd-masthead > *:not(#search-container):not(#logo-container),
      #buttons.ytd-masthead,
      #guide-button {
        display: none !important;
      }
      
      /* Keep YouTube logo */
      #logo-container {
        position: absolute;
        top: -100px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      /* Make page background clean */
      #content {
        background-color: #f9f9f9 !important;
      }
    `;
    
    // Create search shortcut info
    let focusModeInfo = document.getElementById('yt-enhancer-focus-mode-info');
    if (!focusModeInfo) {
      focusModeInfo = document.createElement('div');
      focusModeInfo.id = 'yt-enhancer-focus-mode-info';
      focusModeInfo.style.cssText = 'position: fixed; bottom: 20px; left: 0; width: 100%; text-align: center; font-size: 14px; color: #666;';
      focusModeInfo.textContent = 'Press / to focus on search | ESC to clear search';
      document.body.appendChild(focusModeInfo);
    }
    
    // Add search keyboard shortcut
    document.addEventListener('keydown', function(e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.querySelector('#search-input input').focus();
      }
    });
  }
  
  // When in search results, keep interface clean but allow results
  if (window.location.pathname === '/results') {
    // Create a cleaner search results page
    let style = document.getElementById('yt-enhancer-focus-mode-results');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yt-enhancer-focus-mode-results';
      document.head.appendChild(style);
    }
    
    style.textContent = `
      /* Hide unnecessary elements on search page */
      ytd-guide-renderer,
      #related,
      .ytd-watch-next-secondary-results-renderer {
        display: none !important;
      }
      
      /* Make search results more focused */
      ytd-search {
        max-width: 900px !important;
        margin: 80px auto 0 !important;
      }
      
      /* Create more whitespace around results */
      ytd-video-renderer {
        padding: 15px !important;
        margin-bottom: 10px !important;
        border-radius: 8px !important;
        background-color: white !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
      }
    `;
  }
}

function disableFocusMode() {
  // Remove Focus Mode styles
  const focusModeStyle = document.getElementById('yt-enhancer-focus-mode');
  if (focusModeStyle) {
    focusModeStyle.textContent = '';
  }
  
  const focusModeResultsStyle = document.getElementById('yt-enhancer-focus-mode-results');
  if (focusModeResultsStyle) {
    focusModeResultsStyle.textContent = '';
  }
  
  // Remove info text
  const focusModeInfo = document.getElementById('yt-enhancer-focus-mode-info');
  if (focusModeInfo) {
    focusModeInfo.remove();
  }
}

// Function to auto skip intros, outros, etc.
function setupAutoSkipIntros() {
  // Set up a recurring check for skip buttons
  checkForSkipButtons();
  setInterval(checkForSkipButtons, 1000);
}

function checkForSkipButtons() {
  if (!settings.autoSkipIntros) return;
  
  // Look for any skip button and click it
  const skipButtons = document.querySelectorAll('.ytp-skip-intro-button, .ytp-skip-ad-button, .ytp-skip-outro-button');
  skipButtons.forEach(button => {
    button.click();
  });
}

// Function to toggle distraction-free mode
function enableDistractionFreeMode() {
  // Create and append stylesheet if it doesn't exist
  let style = document.getElementById('yt-enhancer-distraction-free');
  if (!style) {
    style = document.createElement('style');
    style.id = 'yt-enhancer-distraction-free';
    document.head.appendChild(style);
  }
  
  // CSS to hide distracting elements
  style.textContent = `
    /* Hide comments */
    #comments, ytd-comments {
      display: none !important;
    }
    
    /* Hide related videos while watching */
    .ytp-pause-overlay,
    .ytp-endscreen-content,
    #related {
      display: none !important;
    }
    
    /* Hide notifications */
    .ytd-notification-topbar-button-renderer,
    ytd-notification-topbar-button-renderer {
      display: none !important;
    }
    
    /* Clean up sidebar */
    #guide-content ytd-guide-section-renderer:not(:first-child) {
      display: none !important;
    }
  `;
}

function disableDistractionFreeMode() {
  // Remove the distraction-free stylesheet
  const style = document.getElementById('yt-enhancer-distraction-free');
  if (style) {
    style.textContent = '';
  }
}

// Initialize everything
applySettings();