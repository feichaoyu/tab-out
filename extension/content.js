/**
 * content.js — Global Floating Icon for Tab Out
 * 
 * Injects a draggable high-quality floating action button into every page.
 * Clicking it opens an immersive, floating dashboard using an iframe
 * centered on the current page.
 */

(function() {
  // Prevent double injection
  if (document.getElementById('tab-out-floating-root')) return;

  const root = document.createElement('div');
  root.id = 'tab-out-floating-root';
  // Use Shadow DOM to isolate styles from the host page
  const shadow = root.attachShadow({ mode: 'closed' });

  // Design: Pure, minimalist, amber theme
  const style = document.createElement('style');
  style.textContent = `
    /* Host config: don't block interactions unless modal is open */
    :host {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 2147483647; /* Extreme z-index */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* FAB Styles */
    .fab {
      position: absolute;
      /* Default initial right-bottom */
      left: calc(100vw - 80px);
      top: calc(100vh - 80px);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #c8713a; /* Tab Out Amber */
      box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      border: none;
      padding: 0;
      overflow: hidden;
      opacity: 0.9;
      pointer-events: auto;
      /* Only transition visual properties, not position (left/top) to avoid drag lag */
      transition: background 0.3s, box-shadow 0.3s, opacity 0.3s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .fab.dragging {
      cursor: grabbing;
      opacity: 1;
      transform: scale(1.05);
      box-shadow: 0 12px 32px rgba(200, 113, 58, 0.3), 0 6px 16px rgba(0,0,0,0.15);
      transition: background 0.3s, box-shadow 0.3s, opacity 0.3s;
    }

    .fab:not(.dragging):hover {
      transform: scale(1.1) translateY(-2px);
      background: #d4824d;
      box-shadow: 0 8px 24px rgba(200, 113, 58, 0.25), 0 4px 8px rgba(0,0,0,0.1);
      opacity: 1;
    }

    .fab:active:not(.dragging) {
      transform: scale(0.95);
    }

    .icon {
      width: 24px;
      height: 24px;
      color: white;
      transition: transform 0.3s ease;
      pointer-events: none; /* Let drag pass through */
    }

    .fab:not(.dragging):hover .icon {
      transform: rotate(12deg);
    }

    /* Modal Overlay Styles */
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(26, 22, 19, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    .modal-overlay.open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    /* Iframe Container */
    .iframe-container {
      width: 900px;
      max-width: 95vw;
      height: 80vh;
      max-height: 95vh;
      min-width: 400px;
      min-height: 300px;
      background: #f8f5f0;
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.1);
      overflow: hidden;
      transform: translateY(20px) scale(0.98);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      position: relative; /* necessary for inner absolute elements like resize handle */
    }

    /* Custom Resizer Handles */
    .resizer {
      position: absolute;
      z-index: 10;
      background: transparent;
    }
    .resizer-r {
      top: 0; right: 0;
      width: 10px; height: 100%;
      cursor: col-resize;
    }
    .resizer-b {
      bottom: 0; left: 0;
      width: 100%; height: 10px;
      cursor: row-resize;
    }
    .resizer-br {
      bottom: 0; right: 0;
      width: 20px; height: 20px;
      cursor: nwse-resize;
      background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 2L2 10V12H4L12 4V2H10Z' fill='%23c8713a' fill-opacity='0.4'/%3E%3Cpath d='M10 7L7 10V12H9L12 9V7H10Z' fill='%23c8713a' fill-opacity='0.4'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: bottom right;
    }
    .resizer:hover {
      background: rgba(200, 113, 58, 0.05);
    }

    .modal-overlay.open .iframe-container {
      transform: translateY(0) scale(1);
      opacity: 1;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  `;

  // --- HTML Assembly ---
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.title = 'Tab Out (Drag to move)';
  fab.innerHTML = `
    <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h18M9 5v14" />
    </svg>
  `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const iframeContainer = document.createElement('div');
  iframeContainer.className = 'iframe-container';
  
  const iframe = document.createElement('iframe');
  
  iframeContainer.appendChild(iframe);

  // Add custom resizers
  const rsR = document.createElement('div'); rsR.className = 'resizer resizer-r';
  const rsB = document.createElement('div'); rsB.className = 'resizer resizer-b';
  const rsBR = document.createElement('div'); rsBR.className = 'resizer resizer-br';
  iframeContainer.appendChild(rsR);
  iframeContainer.appendChild(rsB);
  iframeContainer.appendChild(rsBR);

  overlay.appendChild(iframeContainer);

  shadow.appendChild(style);
  // Restore persistent sizing
  chrome.storage.local.get(['tabOutModalSize'], (res) => {
    if (res.tabOutModalSize) {
      if (res.tabOutModalSize.width) iframeContainer.style.width = res.tabOutModalSize.width;
      if (res.tabOutModalSize.height) iframeContainer.style.height = res.tabOutModalSize.height;
    }
  });

  // --- Manual Resizing Engine ---
  let isResizing = false;
  let startW = 0, startH = 0;
  let startX_m = 0, startY_m = 0;
  let currentResizer = null;

  function onMouseDownResize(e) {
    isResizing = true;
    currentResizer = e.target;
    startW = iframeContainer.offsetWidth;
    startH = iframeContainer.offsetHeight;
    startX_m = e.clientX;
    startY_m = e.clientY;

    // Prevent iframe from intercepting mouse events during resize
    iframe.style.pointerEvents = 'none';

    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUpResize);
    e.preventDefault();
  }

  function onMouseMoveResize(e) {
    if (!isResizing) return;
    
    const dx = e.clientX - startX_m;
    const dy = e.clientY - startY_m;

    if (currentResizer.classList.contains('resizer-r') || currentResizer.classList.contains('resizer-br')) {
      iframeContainer.style.width = `${startW + dx}px`;
    }
    if (currentResizer.classList.contains('resizer-b') || currentResizer.classList.contains('resizer-br')) {
      iframeContainer.style.height = `${startH + dy}px`;
    }
  }

  function onMouseUpResize() {
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpResize);
    
    iframe.style.pointerEvents = 'auto';

    // Save final size
    chrome.storage.local.set({
      tabOutModalSize: {
        width: iframeContainer.style.width,
        height: iframeContainer.style.height
      }
    });

    // Small delay before releasing the lock to prevent the overlay click from firing
    setTimeout(() => { isResizing = false; }, 100);
  }

  [rsR, rsB, rsBR].forEach(r => r.addEventListener('mousedown', onMouseDownResize));

  shadow.appendChild(fab);
  shadow.appendChild(overlay);

  // --- Modal Logic ---
  let isIframeLoaded = false;

  function openModal() {
    if (!isIframeLoaded) {
      iframe.src = chrome.runtime.getURL('index.html');
      isIframeLoaded = true;
    } else {
      // Notify the iframe that it has been shown again
      iframe.contentWindow?.postMessage({ action: 'modal_opened' }, '*');
    }
    overlay.classList.add('open');
    fab.style.display = 'none'; // Hide FAB while modal is open
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Grant keyboard focus to the iframe so host page doesn't eat shortcuts
    setTimeout(() => {
      iframe.focus();
    }, 50);
  }

  function closeModal() {
    overlay.classList.remove('open');
    fab.style.display = 'flex';
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', (e) => {
    // Treat clicks outside the iframeContainer as dismiss actions
    // Also ignore if we just finished resizing
    if (e.target === overlay && !isResizing) {
      closeModal();
    }
  });

  // Keyboard shortcuts on the host page
  document.addEventListener('keydown', (e) => {
    // Cmd+E (Mac) or Ctrl+E (Windows) to toggle modal
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (overlay.classList.contains('open')) {
        closeModal();
      } else {
        openModal();
      }
    }
    
    // Esc key to close modal
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // --- Dragging Logic ---
  let isDragging = false;
  let startX = 0, startY = 0;
  let rx = 1.0; // Default: right edge
  let ry = 1.0; // Default: bottom edge
  let initialLeft = 0, initialTop = 0;

  function applyRelativePosition() {
    const maxLeft = window.innerWidth - fab.offsetWidth;
    const maxTop = window.innerHeight - fab.offsetHeight;
    
    // Fallback safeguard if dimensions aren't immediately ready
    if (maxLeft < 0 || maxTop < 0) return;

    let newLeft = Math.max(0, Math.min(rx * maxLeft, maxLeft));
    let newTop = Math.max(0, Math.min(ry * maxTop, maxTop));
    fab.style.left = `${newLeft}px`;
    fab.style.top = `${newTop}px`;
  }

  // Restore persistent position if available
  chrome.storage.local.get(['tabOutFabPosition'], (res) => {
    if (res.tabOutFabPosition) {
      rx = res.tabOutFabPosition.rx ?? 1.0;
      ry = res.tabOutFabPosition.ry ?? 1.0;
      
      // Ensure we immediately paint the correct location
      applyRelativePosition();
    }
  });

  // Keep it bounded during window resizes
  window.addEventListener('resize', applyRelativePosition);

  fab.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only process left click
    
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = fab.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault(); // Prevent text selection highlight
  });

  function onMouseMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Minimum movement threshold to define it as a drag (vs a click)
    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging = true;
      fab.classList.add('dragging');
    }

    if (isDragging) {
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Restrict within window boundaries
      const maxLeft = Math.max(0, window.innerWidth - fab.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - fab.offsetHeight);
      
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      fab.style.left = `${newLeft}px`;
      fab.style.top = `${newTop}px`;

      // Update relative proportions
      rx = maxLeft > 0 ? newLeft / maxLeft : 0;
      ry = maxTop > 0 ? newTop / maxTop : 0;
    }
  }

  function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    if (isDragging) {
      fab.classList.remove('dragging');
      // Save position to localStorage persistently across all tabs using extension storage
      chrome.storage.local.set({ 
        tabOutFabPosition: { rx, ry } 
      });
    } else {
      openModal();
    }
    
    // Safety timeout to prevent subsequent events
    setTimeout(() => { isDragging = false; }, 0);
  }

  // --- External Communication Logic ---
  window.addEventListener('message', (e) => {
    if (e.data && e.data.action === 'close_modal') {
      closeModal();
    }
  });

  // Inject into page
  document.body.appendChild(root);

})();
