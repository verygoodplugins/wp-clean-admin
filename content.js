/* Quick & dirty menu cleaner for WordPress admin.
 * Hides all non-core #adminmenu items, but keeps the current page's menu item visible.
 * Core items kept: Dashboard, Posts, Media, Pages, Comments, Appearance, Plugins, Users, Tools, Settings.
 */

(function () {
  const CORE_MENU_SLUGS = new Set([
    // Top-level core items:
    'index.php',                 // Dashboard
    'edit.php',                  // Posts
    'upload.php',                // Media
    'edit.php?post_type=page',   // Pages
    'edit-comments.php',         // Comments
    'themes.php',                // Appearance
    'plugins.php',               // Plugins
    'users.php',                 // Users
    'tools.php',                 // Tools
    'options-general.php',       // Settings

    // Common companions:
    'profile.php',
    'update-core.php'
  ]);

  let enabled = true;
  const storageKey = 'wp_admin_menu_cleaner_enabled';
  let observer = null;
  let isInitialized = false;


  // Immediately inject CSS to hide menu items while we determine state
  // This prevents the flash of unstyled content
  function injectInitialHidingCSS() {
    if (!isWPAdmin()) return;
    
    const style = document.createElement('style');
    style.id = 'vgp-clean-initial-hide';
    style.textContent = `
      /* Temporarily hide non-core menu items until we know the state */
      #adminmenu li.menu-top:not([class*="dashboard"]):not([class*="post"]):not([class*="media"]):not([class*="page"]):not([class*="comment"]):not([class*="appearance"]):not([class*="plugin"]):not([class*="user"]):not([class*="tool"]):not([class*="setting"]) {
        visibility: hidden !important;
      }
    `;
    
    if (document.head) {
      document.head.appendChild(style);
    } else {
      // If head doesn't exist yet, wait for it
      const observer = new MutationObserver((mutations, obs) => {
        if (document.head) {
          document.head.appendChild(style);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // Call this immediately
  injectInitialHidingCSS();

  // Initialize from storage
  chrome.storage.sync.get(storageKey, (result) => {
    if (storageKey in result) {
      enabled = result[storageKey];
    } else {
      // First time - set default
      enabled = true;
      chrome.storage.sync.set({ [storageKey]: enabled });
    }
    
    // Remove initial hiding CSS once we know the state
    const initialHide = document.getElementById('vgp-clean-initial-hide');
    if (initialHide) {
      initialHide.remove();
    }
    
    isInitialized = true;
    waitForAdminMenuAndApply();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[storageKey]) {
      enabled = changes[storageKey].newValue;
      applyState();
    }
  });

  // Listen for direct messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'WP_ADMIN_MENU_CLEANER_TOGGLE') {
      enabled = message.enabled;
      applyState();
      sendResponse({ success: true });
    }
  });

  function isWPAdmin() {
    return location.pathname.includes('/wp-admin/');
  }

  function waitForAdminMenuAndApply() {
    if (!isInitialized) return;
    
    const adminmenu = document.getElementById('adminmenu');
    if (adminmenu) {
      applyState();
    } else {
      // Wait for admin menu to appear
      const observer = new MutationObserver((mutations, obs) => {
        const adminmenu = document.getElementById('adminmenu');
        if (adminmenu) {
          obs.disconnect();
          applyState();
        }
      });
      
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        // Wait for body to exist
        const bodyWaiter = new MutationObserver((mutations, obs) => {
          if (document.body) {
            obs.disconnect();
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
        bodyWaiter.observe(document.documentElement, { childList: true });
      }
    }
  }

  function applyState() {
    if (!isWPAdmin()) {
      return;
    }

    if (enabled) {
      applyCleanUp();
      startObserving();
    } else {
      removeCleanUp();
      stopObserving();
    }
  }

  function startObserving() {
    if (observer) return;
    
    const adminMenu = document.getElementById('adminmenuwrap') || document.getElementById('adminmenu');
    if (!adminMenu) return;

    observer = new MutationObserver(() => {
      if (enabled) {
        clearTimeout(observer.debounceTimer);
        observer.debounceTimer = setTimeout(() => {
          applyCleanUp();
        }, 50);
      }
    });

    observer.observe(adminMenu, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function currentMenuSlugsToKeep() {
    const url = new URL(window.location.href);
    let rel = url.pathname.split('/').pop() || '';
    const q = url.search ? url.search.replace(/^\?/, '') : '';
    if (q) rel += '?' + q;

    const keep = new Set([rel]);

    // Map editor screens back to their parent menu items
    if (/^post(-new)?\.php/.test(rel)) {
      const params = new URLSearchParams(url.search);
      const pt = params.get('post_type');
      if (pt === 'page') {
        keep.add('edit.php?post_type=page');
      } else {
        keep.add('edit.php');
      }
    }

    // For term screens
    if (rel.startsWith('edit-tags.php')) {
      const params = new URLSearchParams(url.search);
      const pt = params.get('post_type');
      if (pt === 'page') {
        keep.add('edit.php?post_type=page');
      } else {
        keep.add('edit.php');
      }
    }

    return keep;
  }

  function applyCleanUp() {
    const adminmenu = document.getElementById('adminmenu');
    if (!adminmenu) {
      return;
    }

    // Add marker class
    document.documentElement.classList.add('vgp-clean-admin');

    const keep = currentMenuSlugsToKeep();
    const allowed = new Set([...CORE_MENU_SLUGS, ...keep]);

    // Hide non-core menu items
    const items = adminmenu.querySelectorAll('li.menu-top');
    let hiddenCount = 0;
    let shownCount = 0;

    items.forEach((li) => {
      const link = li.querySelector(':scope > a.menu-top');
      if (!link) return;

      let hrefRel = '';
      try {
        const aURL = new URL(link.href, window.location.origin);
        hrefRel = aURL.pathname.split('/').pop() || '';
        const qs = aURL.search ? aURL.search.replace(/^\?/, '') : '';
        if (qs) hrefRel += '?' + qs;
      } catch (e) {
        return;
      }

      const shouldKeep = allowed.has(hrefRel) || link.classList.contains('current');
      li.style.display = shouldKeep ? '' : 'none';
      
      if (shouldKeep) {
        shownCount++;
        // Clean submenu items
        const submenu = li.querySelector('.wp-submenu');
        if (submenu) {
          submenu.style.display = '';
          cleanSubmenu(submenu, allowed, keep);
        }
      } else {
        hiddenCount++;
      }
    });

    injectCleanCSS();
  }

  function cleanSubmenu(submenu, allowed, currentSlugs) {
    const submenuItems = submenu.querySelectorAll('li');
    submenuItems.forEach((li) => {
      const link = li.querySelector('a');
      if (!link) return;

      let hrefRel = '';
      try {
        const aURL = new URL(link.href, window.location.origin);
        hrefRel = aURL.pathname.split('/').pop() || '';
        const qs = aURL.search ? aURL.search.replace(/^\?/, '') : '';
        if (qs) hrefRel += '?' + qs;
      } catch (e) {
        return;
      }

      const shouldKeep = allowed.has(hrefRel) || 
                        currentSlugs.has(hrefRel) || 
                        link.classList.contains('current') ||
                        li.classList.contains('current');
      
      li.style.display = shouldKeep ? '' : 'none';
    });
  }

  function removeCleanUp() {
    // Remove marker class
    document.documentElement.classList.remove('vgp-clean-admin');
    
    // Remove injected CSS
    const style = document.getElementById('vgp-clean-style');
    if (style) {
      style.remove();
    }

    // Show all menu items
    const adminmenu = document.getElementById('adminmenu');
    if (!adminmenu) {
      return;
    }

    const items = adminmenu.querySelectorAll('li.menu-top');
    let restoredCount = 0;

    items.forEach((li) => {
      li.style.display = '';
      restoredCount++;
      
      // Restore submenu items
      const submenu = li.querySelector('.wp-submenu');
      if (submenu) {
        submenu.style.display = '';
        submenu.querySelectorAll('li').forEach((subLi) => {
          subLi.style.display = '';
        });
      }
    });

  }

  function injectCleanCSS() {
    if (document.getElementById('vgp-clean-style')) return;

    const style = document.createElement('style');
    style.id = 'vgp-clean-style';
    style.textContent = `
      /* Avoid stray separators taking up space */
      html.vgp-clean-admin #adminmenu li.wp-menu-separator { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // Handle page navigation events
  window.addEventListener('load', () => {
    if (isInitialized) {
      applyState();
    }
  });
})();