/**
 * Main content script for iFilterReddit extension.
 * Filters Reddit posts based on subreddit filters.
 */

// Store current filters and enabled state
let filters = [];
let enabled = true;

/**
 * Initializes the extension by:
 * 1. Loading filters and enabled state from storage.
 * 2. Setting up storage change listener.
 * 3. Setting up mutation observer for dynamic content.
 * 4. Setting up message listener for toggle updates.
 */
function initializeExtension() {
  try {
    // Load initial state
    chrome.storage.sync.get(['filters', 'enabled'], (result) => {
      filters = result.filters || [];
      enabled = result.enabled !== undefined ? result.enabled : true;
      filterPosts();
    });

    // Listen for toggle state changes
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'toggleFilter') {
        enabled = message.enabled;
        filterPosts();
      }
    });

    // Update filters when they change.
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.filters) {
        filters = changes.filters.newValue;
        filterPosts();
      }
    });

    // Watch for dynamically loaded content.
    new MutationObserver(() => filterPosts()).observe(document.body, {
      childList: true,
      subtree: true
    });

    // Filter posts when DOM is ready.
    document.addEventListener('DOMContentLoaded', filterPosts);
  } catch (err) {
    console.error('Extension initialization error:', err);
  }
}

// Add styles for hiding posts
const style = document.createElement('style');
style.textContent = `
  .ifilter-hidden {
    display: none !important;
  }
`;
document.head.appendChild(style);

/**
 * Filters posts by hiding those from filtered subreddits.
 * Handles both search results and home feed posts.
 */
function filterPosts() {
  // If filtering is disabled, unhide all posts and return
  if (!enabled) {
    document.querySelectorAll('.ifilter-hidden').forEach(post => {
      post.classList.remove('ifilter-hidden');
    });
    return;
  }

  // First, unhide all previously hidden posts
  document.querySelectorAll('.ifilter-hidden').forEach(post => {
    post.classList.remove('ifilter-hidden');
  });

  // Then hide posts matching current filters
  document.querySelectorAll('a[href^="/r/"]').forEach(link => {
    const subreddit = link.getAttribute('href').match(/^\/r\/([^/]+)/)?.[1]?.toLowerCase();
    
    if (subreddit && filters.includes(subreddit)) {
      // Find and hide the post element
      const postElement = link.closest('faceplate-tracker, shreddit-post, article, search-telemetry-tracker');
      if (postElement) {
        postElement.classList.add('ifilter-hidden');
      }
    }
  });
}

// Start the extension.
initializeExtension();
