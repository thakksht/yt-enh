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
  
  // If we're on search results page, also hide shorts there
  if (window.location.pathname === '/results') {
    hideSearchShorts();
  }
}

// Specific function to hide shorts in search results
function hideSearchShorts() {
  // Target shorts in search results more specifically
  const searchShorts = document.querySelectorAll(`
    ytd-video-renderer:has(a[href^="/shorts/"]), 
    ytd-reel-item-renderer, 
    ytd-reel-shelf-renderer,
    ytd-rich-section-renderer:has(span:contains("Shorts")),
    ytd-shelf-renderer:has([title*="Short"]),
    ytd-shelf-renderer:has([title*="short"]),
    ytd-item-section-renderer:has(#dismissible a[href^="/shorts/"])
  `);
  
  searchShorts.forEach(item => {
    item.style.display = 'none';
  });
  
  // Also hide any shelf containing shorts
  const shortShelves = document.querySelectorAll('ytd-shelf-renderer, ytd-item-section-renderer');
  shortShelves.forEach(shelf => {
    // Check if shelf title contains "Short" or has shorts content
    const title = shelf.querySelector('#title-text');
    if (title && (title.textContent.toLowerCase().includes('short') || 
       shelf.querySelector('a[href^="/shorts/"]'))) {
      shelf.style.display = 'none';
    }
  });
  
  // Hide any section with shorts
  const shortSections = document.querySelectorAll('ytd-rich-section-renderer');
  shortSections.forEach(section => {
    if (section.textContent.toLowerCase().includes('short') || 
        section.querySelector('a[href^="/shorts/"]')) {
      section.style.display = 'none';
    }
  });
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
      
      /* Make page background clean */
      #content {
        background-color: #f9f9f9 !important;
      }
      
      /* Hide guide menu when in focus mode */
      #guide-inner-content, 
      tp-yt-app-drawer {
        display: none !important;
      }
      
      /* Only keep essential header elements */
      ytd-masthead > *:not(#logo-container),
      #buttons.ytd-masthead,
      #guide-button {
        display: none !important;
      }
      
      /* Keep YouTube logo but style it */
      #logo-container {
        margin: 0 auto !important;
        position: relative !important;
        display: block !important;
        text-align: center !important;
        padding-top: 40px !important;
      }
    `;
    
    // Create a custom search container that replaces the standard YouTube interface
    const existingSearchContainer = document.getElementById('yt-enhancer-search-container');
    if (!existingSearchContainer) {
      // Create custom search interface
      const searchContainer = document.createElement('div');
      searchContainer.id = 'yt-enhancer-search-container';
      searchContainer.style.cssText = `
        position: fixed;
        top: 150px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 800px;
        padding: 30px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        text-align: center;
        z-index: 9999;
      `;
      
      // Add heading
      const heading = document.createElement('h1');
      heading.textContent = 'Focus Mode - YouTube Enhancer';
      heading.style.cssText = `
        color: #cc0000;
        margin-bottom: 20px;
        font-size: 24px;
      `;
      searchContainer.appendChild(heading);
      
      // Add description
      const description = document.createElement('p');
      description.textContent = 'Search for what you want to learn without distractions';
      description.style.cssText = `
        color: #666;
        margin-bottom: 30px;
        font-size: 16px;
      `;
      searchContainer.appendChild(description);
      
      // Create search form
      const searchForm = document.createElement('form');
      searchForm.id = 'yt-enhancer-search-form';
      searchForm.style.cssText = `
        display: flex;
        width: 100%;
        margin-bottom: 20px;
      `;
      
      // Create search input
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search YouTube...';
      searchInput.id = 'yt-enhancer-search-input';
      searchInput.style.cssText = `
        flex: 1;
        padding: 15px 20px;
        font-size: 18px;
        border: 2px solid #cc0000;
        border-radius: 30px 0 0 30px;
        outline: none;
      `;
      searchForm.appendChild(searchInput);
      
      // Create search button
      const searchButton = document.createElement('button');
      searchButton.type = 'submit';
      searchButton.id = 'yt-enhancer-search-button';
      searchButton.textContent = 'Search';
      searchButton.style.cssText = `
        background-color: #cc0000;
        color: white;
        border: none;
        padding: 15px 25px;
        font-size: 18px;
        font-weight: bold;
        border-radius: 0 30px 30px 0;
        cursor: pointer;
      `;
      searchForm.appendChild(searchButton);
      
      // Add event listener to the form
      searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchQuery = searchInput.value.trim();
        if (searchQuery) {
          // Redirect to YouTube search results with the query
          window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        }
      });
      
      searchContainer.appendChild(searchForm);
      
      // Add popular learning categories
      const categoriesContainer = document.createElement('div');
      categoriesContainer.style.cssText = `
        margin-top: 30px;
        text-align: left;
      `;
      
      const categoriesHeading = document.createElement('h3');
      categoriesHeading.textContent = 'Popular Learning Categories:';
      categoriesHeading.style.cssText = `
        color: #333;
        margin-bottom: 15px;
        font-size: 18px;
      `;
      categoriesContainer.appendChild(categoriesHeading);
      
      // Define popular learning categories
      const categories = [
        { name: 'Programming Tutorials', query: 'programming tutorials' },
        { name: 'Science Explanations', query: 'science explained' },
        { name: 'Math Lessons', query: 'mathematics lessons' },
        { name: 'History Documentaries', query: 'history documentary' },
        { name: 'Language Learning', query: 'learn language' },
        { name: 'DIY & Crafts', query: 'DIY tutorials' }
      ];
      
      // Create category grid
      const categoryGrid = document.createElement('div');
      categoryGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
      `;
      
      categories.forEach(category => {
        const categoryLink = document.createElement('a');
        categoryLink.textContent = category.name;
        categoryLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(category.query)}`;
        categoryLink.style.cssText = `
          display: block;
          background-color: #f5f5f5;
          padding: 10px 15px;
          border-radius: 5px;
          text-decoration: none;
          color: #333;
          font-size: 14px;
          transition: background-color 0.2s;
        `;
        
        // Add hover effect
        categoryLink.addEventListener('mouseenter', function() {
          this.style.backgroundColor = '#e5e5e5';
        });
        
        categoryLink.addEventListener('mouseleave', function() {
          this.style.backgroundColor = '#f5f5f5';
        });
        
        categoryGrid.appendChild(categoryLink);
      });
      
      categoriesContainer.appendChild(categoryGrid);
      searchContainer.appendChild(categoriesContainer);
      
      // Add the custom search container to the body
      document.body.appendChild(searchContainer);
      
      // Auto-focus the search input
      setTimeout(() => {
        searchInput.focus();
      }, 500);
    }
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
    
    // If hide shorts is also enabled, make sure we hide shorts in search results
    if (settings.hideShorts) {
      hideSearchShorts();
      
      // Set up a continuous check for shorts in search results as they might load dynamically
      if (!window.hideSearchShortsInterval) {
        window.hideSearchShortsInterval = setInterval(hideSearchShorts, 1000);
      }
    }
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
  
  // Remove the custom search container
  const searchContainer = document.getElementById('yt-enhancer-search-container');
  if (searchContainer) {
    searchContainer.remove();
  }
  
  // Clear the shorts hiding interval if it exists
  if (window.hideSearchShortsInterval) {
    clearInterval(window.hideSearchShortsInterval);
    window.hideSearchShortsInterval = null;
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