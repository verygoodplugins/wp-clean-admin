# Privacy Policy - WP Admin Menu Cleaner

**Last Updated: August 13, 2025**

## Overview

WP Admin Menu Cleaner is a Chrome extension that helps clean up WordPress admin menus by hiding non-core menu items while preserving the current page's menu item. This privacy policy explains what data we collect, how we use it, and your rights regarding your information.

## Data Collection and Usage

### What We Collect
- **Extension Settings**: We store your preference for whether the menu cleaning feature is enabled or disabled
- **No Personal Data**: We do not collect, store, or transmit any personal information, browsing history, or website content

### How We Store Data
- Settings are stored locally in your browser using Chrome's `chrome.storage.sync` API
- This data is synced across your Chrome browsers when you're signed in to Chrome
- No data is sent to external servers or third parties

### What We Don't Collect
- Personal information (name, email, etc.)
- Browsing history
- Website content or data
- WordPress login credentials
- Any data from websites you visit

## Permissions Explained

### Storage Permission
- **Purpose**: Store your on/off preference for the extension
- **Scope**: Only stores a single boolean value (enabled/disabled)
- **Access**: Data remains in your browser and Chrome sync

### Active Tab Permission
- **Purpose**: Communicate with the current WordPress admin tab to apply/remove menu cleaning
- **Scope**: Only active when you're on WordPress admin pages (`/wp-admin/`)
- **Access**: No data is read from or sent to the webpage

### Host Permissions (`*://*/wp-admin/*`)
- **Purpose**: Run the menu cleaning script on WordPress admin pages
- **Scope**: Only WordPress admin areas, not regular website pages
- **Access**: Modifies only the visual display of admin menus, doesn't access content

## Data Security

- All data remains local to your browser
- No external network requests are made
- No analytics or tracking code is included
- Extension operates entirely offline

## Third-Party Services

This extension does not use any third-party services, analytics, or external APIs.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date above.

## Contact

For questions about this privacy policy, please contact us through our GitHub repository:
https://github.com/verygoodplugins/wp-clean-admin

## Your Rights

Since we don't collect personal data, there's no personal data to delete or modify. You can:
- Disable the extension at any time through Chrome's extension settings
- Remove all extension data by uninstalling the extension
- Clear extension settings through Chrome's extension management page
