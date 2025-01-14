document.addEventListener('DOMContentLoaded', () => {
  const filterList = document.getElementById('filter-list');
  const subredditInput = document.getElementById('subreddit-input');
  const addBtn = document.getElementById('add-btn');
  
  // Load saved filters
  chrome.storage.sync.get(['filters'], (result) => {
    const filters = result.filters || [];
    renderFilters(filters);
  });

  // Add new filter
  addBtn.addEventListener('click', () => {
    const subreddit = subredditInput.value.trim().toLowerCase();
    if (subreddit && !subreddit.includes(' ')) {
      chrome.storage.sync.get(['filters'], (result) => {
        const filters = result.filters || [];
        if (!filters.includes(subreddit)) {
          filters.push(subreddit);
          chrome.storage.sync.set({ filters }, () => {
            renderFilters(filters);
            subredditInput.value = '';
          });
        }
      });
    }
  });

  // Remove filter
  filterList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const subreddit = e.target.dataset.subreddit;
      chrome.storage.sync.get(['filters'], (result) => {
        const filters = result.filters.filter(f => f !== subreddit);
        chrome.storage.sync.set({ filters }, () => {
          renderFilters(filters);
        });
      });
    }
  });

  function renderFilters(filters) {
    filterList.innerHTML = filters.map(subreddit => `
      <li class="filter-item">
        <span>r/${subreddit}</span>
        <button class="remove-btn" data-subreddit="${subreddit}">Remove</button>
      </li>
    `).join('');
  }
});
