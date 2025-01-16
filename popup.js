document.addEventListener('DOMContentLoaded', () => {
  const filterList = document.getElementById('filter-list');
  const subredditInput = document.getElementById('subreddit-input');
  const addBtn = document.getElementById('add-btn');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const filterToggle = document.getElementById('filter-toggle');

  // Initialize toggle state
  chrome.storage.sync.get(['enabled'], (result) => {
    const enabled = result.enabled !== undefined ? result.enabled : true;
    filterToggle.checked = enabled;
    updateToggleLabel(enabled);
  });

  // Toggle filter functionality
  filterToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ enabled }, () => {
      updateToggleLabel(enabled);
      // Send message to content script to update filtering state
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'toggleFilter', enabled});
      });
    });
  });

  function updateToggleLabel(enabled) {
    const toggleLabel = document.querySelector('.toggle-label');
    toggleLabel.textContent = enabled ? 'Filtering Enabled' : 'Filtering Disabled';
  }
  
  // Load saved filters
  chrome.storage.sync.get(['filters'], (result) => {
    const filters = result.filters || [];
    renderFilters(filters);
  });

  // Add new filter
  const addFilter = () => {
    const subreddit = subredditInput.value.trim().toLowerCase();
    if (subreddit && !subreddit.includes(' ')) {
      chrome.storage.sync.get(['filters'], (result) => {
        const filters = result.filters || [];
        if (!filters.includes(subreddit)) {
          filters.push(subreddit);
          chrome.storage.sync.set({ filters }, () => {
            renderFilters(filters);
            subredditInput.value = '';
            showStatus(`Added r/${subreddit} to filters`, 'success');
          });
        } else {
          showStatus(`r/${subreddit} is already in your filters`, 'info');
        }
      });
    } else if (subreddit) {
      showStatus('Subreddit names cannot contain spaces', 'error');
    }
  };

  // Add filter on button click
  addBtn.addEventListener('click', addFilter);

  // Add filter on Enter key press
  subredditInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addFilter();
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
    
    // Update filter count display
    const filterCount = document.getElementById('filter-count');
    filterCount.textContent = `${filters.length} active filter${filters.length !== 1 ? 's' : ''}`;
  }

  // Export filters
  exportBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['filters'], (result) => {
      const filters = result.filters || [];
      if (filters.length === 0) {
        showStatus('No filters to export', 'error');
        return;
      }

      const blob = new Blob([JSON.stringify(filters, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: 'iFilterReddit_filters.json',
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
        showStatus(`Exported ${filters.length} filters`, 'success');
      });
    });
  });

  const statusMessage = document.getElementById('status-message');
  
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `visible ${type}`;
    setTimeout(() => {
      statusMessage.className = '';
    }, 5000);
  }

  // Clear all filters
  const clearBtn = document.getElementById('clear-btn');
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all filters? This action cannot be undone.')) {
      chrome.storage.sync.set({ filters: [] }, () => {
        renderFilters([]);
        showStatus('All filters cleared', 'success');
      });
    }
  });

  // Import filters
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File size validation (max 1MB)
    if (file.size > 1024 * 1024) {
      showStatus('File too large. Maximum size is 1MB', 'error');
      return;
    }

    // Show loading state
    const originalBtnText = exportBtn.textContent;
    exportBtn.textContent = 'Importing...';
    exportBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedFilters = JSON.parse(event.target.result);
        if (!Array.isArray(importedFilters)) {
          throw new Error('Invalid file format');
        }

        // Validate each filter
        const validFilters = importedFilters.filter(filter => 
          typeof filter === 'string' && 
          !filter.includes(' ') && 
          filter.trim().length > 0
        );

        if (validFilters.length === 0) {
          throw new Error('No valid filters found in file');
        }

        chrome.storage.sync.get(['filters'], (result) => {
          const existingFilters = result.filters || [];
          const newFilters = [...new Set([...existingFilters, ...validFilters])];
          
          // Send keep-alive message to service worker
          chrome.runtime.sendMessage({type: 'keepAlive'});
          
          chrome.storage.sync.set({ filters: newFilters }, () => {
            renderFilters(newFilters);
            exportBtn.textContent = originalBtnText;
            exportBtn.disabled = false;
            showStatus(`Successfully imported ${validFilters.length} filters`, 'success');
            importInput.value = ''; // Reset input to allow re-import
          });
        });
      } catch (error) {
        exportBtn.textContent = originalBtnText;
        exportBtn.disabled = false;
        showStatus(`Error importing filters: ${error.message}`, 'error');
        importInput.value = ''; // Reset input even on error
      }
    };
    
    reader.onerror = () => {
      exportBtn.textContent = originalBtnText;
      exportBtn.disabled = false;
      showStatus('Error reading file', 'error');
      importInput.value = ''; // Reset input on read error
    };
    
    reader.readAsText(file);
  });
});
