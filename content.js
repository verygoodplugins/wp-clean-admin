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

  // Read enabled flag from storage (default true)
  let enabled = true;

  const storageKey = 'wp_admin_menu_cleaner_enabled';

  chrome.storage?.sync?.get(storageKey, (res) => {
    if (res && typeof res[storageKey] === 'boolean') {
      enabled = res[storageKey];
    }
    maybeApply();
  });

  // Listen for popup toggle
  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg && msg.type === 'WP_ADMIN_MENU_CLEANER_TOGGLE') {
      enabled = !!msg.enabled;
      maybeApply({ force: true });
    }
  });

  // Re-apply if admin menu changes (rare, but helps)
  const obs = new MutationObserver(() => {
    if (!enabled) return;
    debounceApply();
  });

  let debTimer = null;
  function debounceApply() {
    clearTimeout(debTimer);
    debTimer = setTimeout(() => applyCleanUp(), 50);
  }

  function maybeApply({ force = false } = {}) {
    if (!isWPAdmin()) return;
    if (enabled) {
      applyCleanUp({ force });
      // Observe changes in the admin menu area
      const wrap = document.getElementById('adminmenuwrap') || document.getElementById('adminmenu');
      if (wrap) {
        obs.observe(wrap, { childList: true, subtree: true });
      }
    } else {
      cleanupStyles();
      obs.disconnect();
    }
  }

  function isWPAdmin() {
    // Basic sanity check
    return location.pathname.includes('/wp-admin/');
  }

  function currentMenuSlugsToKeep() {
    // Determine the "current" page slug (so its menu entry remains).
    // Normalize to relative "wp-admin/..." path, like WP does in menu hrefs.
    const url = new URL(window.location.href);
    let rel = url.pathname.split('/').pop() || '';
    const q = url.search ? url.search.replace(/^\?/, '') : '';
    if (q) rel += '?' + q;

    // Examples we want to keep as-is:
    // - edit.php?post_type=page
    // - admin.php?page=my-plugin
    // - plugins.php
    // Some screens (like post.php, post-new.php) should map back to the Posts or Pages parent.
    // We'll keep both the exact page and the nearest "editor family" parent.

    const keep = new Set([rel]);

    // Map editor-like screens back to their parent menu items.
    if (/^post(-new)?\.php/.test(rel)) {
      // Guess parent based on post_type
      const params = new URLSearchParams(url.search);
      const pt = params.get('post_type');
      if (pt === 'page') {
        keep.add('edit.php?post_type=page');
      } else {
        keep.add('edit.php'); // default posts
      }
    }

    // For term screens, etc., WP highlights the parent CPT/Posts item
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

  function cleanSubmenu(submenu, allowed, currentSlugs) {
    // Clean up submenu items, keeping only core items and current page items
    const submenuItems = submenu.querySelectorAll('li');
    submenuItems.forEach((li) => {
      const link = li.querySelector('a');
      if (!link) return;

      // Normalize submenu link href
      let hrefRel = '';
      try {
        const aURL = new URL(link.href, window.location.origin);
        hrefRel = aURL.pathname.split('/').pop() || '';
        const qs = aURL.search ? aURL.search.replace(/^\?/, '') : '';
        if (qs) hrefRel += '?' + qs;
      } catch (e) {
        // If parsing fails, keep it visible to be safe
        return;
      }

      // Keep if it's a core item, current page, or has current class
      const shouldKeep = allowed.has(hrefRel) || 
                        currentSlugs.has(hrefRel) || 
                        link.classList.contains('current') ||
                        li.classList.contains('current');
      
      li.style.display = shouldKeep ? '' : 'none';
    });
  }

  function applyCleanUp({ force = false } = {}) {
    if (!force && !enabled) return;

    const adminmenu = document.getElementById('adminmenu');
    if (!adminmenu) return;

    // Add a marker class for optional CSS tweaks
    document.documentElement.classList.add('vgp-clean-admin');

    const keep = currentMenuSlugsToKeep();

    // Build a set of hrefs we'll keep (core + current)
    const allowed = new Set([...CORE_MENU_SLUGS, ...keep]);

    // Iterate all menu links and hide those that are not allowed
    const items = adminmenu.querySelectorAll('li.menu-top');
    items.forEach((li) => {
      const link = li.querySelector(':scope > a.menu-top');
      if (!link) return;

      // Normalize the link href the same way
      let hrefRel = '';
      try {
        const aURL = new URL(link.href, window.location.origin);
        hrefRel = aURL.pathname.split('/').pop() || '';
        const qs = aURL.search ? aURL.search.replace(/^\?/, '') : '';
        if (qs) hrefRel += '?' + qs;
      } catch (e) {
        // If parsing fails, skip hiding to be safe
        return;
      }

      const shouldKeep = allowed.has(hrefRel) || link.classList.contains('current');
      li.style.display = shouldKeep ? '' : 'none';

      // If this is the current parent (e.g., top-level), keep its submenu visible
      // but also clean up the submenu items
      if (shouldKeep) {
        const submenu = li.querySelector('.wp-submenu');
        if (submenu) {
          submenu.style.display = '';
          cleanSubmenu(submenu, allowed, keep);
        }
      }
    });

    // Optional: tighten the menu column to avoid a big empty gap
    injectCSS();
  }

  function injectCSS() {
    if (document.getElementById('vgp-clean-style')) return;

    const style = document.createElement('style');
    style.id = 'vgp-clean-style';
    style.textContent = `
      /* Avoid stray separators taking up space */
      html.vgp-clean-admin #adminmenu li.wp-menu-separator { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function cleanupStyles() {
    document.documentElement.classList.remove('vgp-clean-admin');
    const style = document.getElementById('vgp-clean-style');
    if (style) style.remove();

    // Unhide everything
    const adminmenu = document.getElementById('adminmenu');
    if (!adminmenu) return;
    adminmenu.querySelectorAll('li.menu-top').forEach((li) => {
      li.style.display = '';
      const submenu = li.querySelector('.wp-submenu');
      if (submenu) {
        submenu.style.display = '';
        // Restore all submenu items
        submenu.querySelectorAll('li').forEach((subLi) => {
          subLi.style.display = '';
        });
      }
    });
  }

  // If the page navigates via Turbo-like behavior, re-apply on load events
  window.addEventListener('load', () => maybeApply({ force: true }));
})();
