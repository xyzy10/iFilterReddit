/**
 * Main content script for iFilterReddit extension.
 * Filters Reddit posts based on subreddit filters.
 */

// Store current filters.
let filters = [];

/**
 * Initializes the extension by:
 * 1. Loading filters from storage.
 * 2. Setting up storage change listener.
 * 3. Setting up mutation observer for dynamic content.
 */
function initializeExtension() {
  try {
    // Load initial filters and filter posts.
    chrome.storage.sync.get(['filters'], (result) => {
      filters = result.filters || [];
      filterPosts();
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

/**
 * Filters posts by removing those from filtered subreddits.
 * Handles both search results and home feed posts.
 */
function filterPosts() {
  document.querySelectorAll('a[href^="/r/"]').forEach(link => {
    const subreddit = link.getAttribute('href').match(/^\/r\/([^/]+)/)?.[1]?.toLowerCase();
    
    if (subreddit && filters.includes(subreddit)) {
      // Find and remove the post element.
      const postElement = link.closest('faceplate-tracker, shreddit-post, article');
      postElement?.remove();
    }
  });
}

// Start the extension.
initializeExtension();
