const storageKey = "wp_admin_menu_cleaner_enabled";
const toggle = document.getElementById("toggle");
const state = document.getElementById("state");
let isUpdating = false;


function updateUI(enabled) {
  isUpdating = true;
  toggle.checked = !!enabled;
  state.textContent = enabled ? "On" : "Off";
  isUpdating = false;
}

// Load initial state from storage
chrome.storage.sync.get(storageKey, (result) => {
  const enabled = storageKey in result ? !!result[storageKey] : true;
  updateUI(enabled);
});

// Handle checkbox clicks
toggle.addEventListener("click", async (e) => {
  
  if (isUpdating) {
    return;
  }
  
  const enabled = toggle.checked;
  
  // Update UI
  state.textContent = enabled ? "On" : "Off";
  
  // Save to storage
  chrome.storage.sync.set({ [storageKey]: enabled }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Storage save error:', chrome.runtime.lastError);
    } else {
    }
  });

  // Try to send message to content script for immediate update
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    
    if (tab && tab.id) {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "WP_ADMIN_MENU_CLEANER_TOGGLE", enabled: enabled },
        (response) => {
          if (chrome.runtime.lastError) {
          } else {
          }
        }
      );
    } else {
    }
  } catch (error) {
  }
});

// Also handle label clicks
state.addEventListener("click", (e) => {
  e.preventDefault();
  toggle.click();
});

// Debug: Log any storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[storageKey]) {
  }
});