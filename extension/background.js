/**
 * background.js — Service Worker for Badge Updates
 *
 * Chrome's "always-on" background script for Tab Out.
 * Its only job: keep the toolbar badge showing the current open tab count.
 *
 * Since we no longer have a server, we query chrome.tabs directly.
 * The badge counts real web tabs (skipping chrome:// and extension pages).
 *
 * Color coding gives a quick at-a-glance health signal:
 *   Green  (#3d7a4a) → 1–10 tabs  (focused, manageable)
 *   Amber  (#b8892e) → 11–20 tabs (getting busy)
 *   Red    (#b35a5a) → 21+ tabs   (time to cull!)
 */

// ─── Badge updater ────────────────────────────────────────────────────────────

/**
 * updateBadge()
 *
 * Counts open real-web tabs and updates the extension's toolbar badge.
 * "Real" tabs = not chrome://, not extension pages, not about:blank.
 */
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});

    // Only count actual web pages — skip browser internals and extension pages
    const count = tabs.filter(t => {
      const url = t.url || '';
      return (
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('edge://') &&
        !url.startsWith('brave://')
      );
    }).length;

    // Don't show "0" — an empty badge is cleaner
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });

    if (count === 0) return;

    // Pick badge color based on workload level
    let color;
    if (count <= 10) {
      color = '#3d7a4a'; // Green — you're in control
    } else if (count <= 20) {
      color = '#b8892e'; // Amber — things are piling up
    } else {
      color = '#b35a5a'; // Red — time to focus and close some tabs
    }

    await chrome.action.setBadgeBackgroundColor({ color });

  } catch {
    // If something goes wrong, clear the badge rather than show stale data
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Injection Helper (for updates/install) ───────────────────────────────────

/**
 * injectContentScripts()
 * 
 * Programmatically injects the content script into all eligible tabs.
 * This ensures the extension works immediately on existing tabs after 
 * installation or update without requiring a manual page refresh.
 */
async function injectContentScripts() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file://*/*'] });
    for (const tab of tabs) {
      // Skip internal chrome pages or broken tabs
      if (!tab.url || tab.url.startsWith('chrome://')) continue;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).catch(err => {
        // Expected for restricted pages (e.g. Chrome Web Store)
        console.warn(`[tab-out] Could not inject into tab ${tab.id}:`, err);
      });
    }
  } catch (err) {
    console.error('[tab-out] Bulk injection failed:', err);
  }
}

async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}

async function openSidePanelFallback(tab) {
  if (!chrome.sidePanel?.open) return;

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (err) {
    console.warn('[tab-out] Could not open side panel fallback:', err);
  }
}

async function toggleTabOutForActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-tab-out-modal' });
    return;
  } catch {}

  try {
    await injectContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-tab-out-modal' });
  } catch (err) {
    console.warn('[tab-out] Could not toggle in-page modal:', err);
    await openSidePanelFallback(tab);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Update badge when the extension is first installed
chrome.runtime.onInstalled.addListener((details) => {
  updateBadge();
  
  // If installed or updated, push the content script to all existing pages
  if (details.reason === 'install' || details.reason === 'update') {
    injectContentScripts();
  }

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

// Update badge when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is opened
chrome.tabs.onCreated.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is closed
chrome.tabs.onRemoved.addListener(() => {
  updateBadge();
});

// Update badge when a tab's URL changes (e.g. navigating to/from chrome://)
chrome.tabs.onUpdated.addListener(() => {
  updateBadge();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-tab-out') {
    toggleTabOutForActiveTab();
  }
});

// ─── Initial run ─────────────────────────────────────────────────────────────

// Run once immediately when the service worker first loads
updateBadge();
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
