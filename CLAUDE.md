# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WP Admin Menu Cleaner is a Chrome extension (Manifest V3) that hides non-core WordPress admin menu items while preserving the current page's menu visibility. The extension is designed for creating clean screenshots, screencasts, and demos without plugin/theme clutter.

## Architecture

### Core Components

1. **content.js** - Main logic that runs on WordPress admin pages
   - Defines `CORE_MENU_SLUGS` set with WordPress core menu items to keep visible
   - Implements smart detection of current page to preserve its menu item
   - Uses MutationObserver to handle dynamic menu changes
   - Manages enabled/disabled state via Chrome storage API

2. **popup.html** - Extension popup interface
   - Simple toggle switch to enable/disable menu cleaning
   - Communicates with content script via Chrome messaging API
   - Persists state using Chrome storage sync

3. **manifest.json** - Chrome extension configuration
   - Content script matches pattern: `*://*/wp-admin/*`
   - Requires storage permission for state persistence
   - Runs at `document_idle` for optimal performance

### Key Behaviors

- **Current Page Detection**: Maps editor screens (post.php, post-new.php) back to their parent menu items (Posts/Pages)
- **Submenu Handling**: Recursively cleans submenu items while preserving current page indicators
- **State Management**: Uses `chrome.storage.sync` with key `wp_admin_menu_cleaner_enabled` (defaults to true)
- **CSS Injection**: Adds `.vgp-clean-admin` class to document root and injects styles to hide menu separators

## Development Commands

This is a simple Chrome extension with no build process:

```bash
# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this directory

# Test on WordPress site
# Navigate to any /wp-admin/ URL and verify menu cleaning

# Package for distribution
# Use Chrome's "Pack extension" feature in developer mode
```

## Testing Approach

Manual testing in Chrome with a WordPress installation:
- Test toggle functionality via popup
- Verify current page menu item stays visible
- Test with various WordPress admin pages (posts, pages, plugins, settings)
- Verify submenu items are properly filtered
- Test with both core and plugin-added menu items

## WordPress Core Menu Slugs

The following menu items are always preserved:
- `index.php` - Dashboard
- `edit.php` - Posts
- `upload.php` - Media
- `edit.php?post_type=page` - Pages
- `edit-comments.php` - Comments
- `themes.php` - Appearance
- `plugins.php` - Plugins
- `users.php` - Users
- `tools.php` - Tools
- `options-general.php` - Settings
- `profile.php` - Profile
- `update-core.php` - Updates

## Chrome Extension APIs Used

- **chrome.storage.sync**: State persistence across devices
- **chrome.runtime.onMessage**: Communication between popup and content script
- **chrome.tabs**: Query and message active tabs from popup
- **MutationObserver**: React to dynamic WordPress admin menu changes

## Code Patterns

- Self-contained IIFE to avoid global scope pollution
- Debounced MutationObserver callbacks (50ms) to handle rapid DOM changes
- URL normalization for consistent menu slug comparison
- Force re-application on window load for navigation events