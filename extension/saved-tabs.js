(function (global) {
  'use strict';

  function toIsoString(value) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  function escapeAttr(value = '') {
    return String(value).replace(/"/g, '&quot;');
  }

  function saveDeferredEntry(deferred = [], tab, now = new Date()) {
    return deferred.concat({
      id:        Date.now().toString(),
      url:       tab.url,
      title:     tab.title,
      savedAt:   toIsoString(now),
      completed: false,
      dismissed: false,
    });
  }

  function splitVisibleDeferredTabs(deferred = []) {
    const visible = deferred.filter(item => !item.dismissed);
    return {
      active: visible.filter(item => !item.completed),
      archived: visible.filter(item => item.completed),
    };
  }

  function completeDeferredEntry(deferred = [], id, now = new Date()) {
    const completedAt = toIsoString(now);
    return deferred.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        completed: true,
        completedAt,
      };
    });
  }

  function dismissDeferredEntry(deferred = [], id) {
    return deferred.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        dismissed: true,
      };
    });
  }

  function removeDeferredEntry(deferred = [], id) {
    return deferred.filter(item => item.id !== id);
  }

  function restoreDeferredEntry(deferred = [], id, now = new Date()) {
    let restoredItem = null;
    const restoredAt = toIsoString(now);

    const nextDeferred = deferred.map(item => {
      if (item.id !== id || item.dismissed) return item;
      restoredItem = { ...item };
      return {
        ...item,
        dismissed: true,
        restoredAt,
      };
    });

    return {
      deferred: nextDeferred,
      restoredItem,
    };
  }

  function moveDeferredEntryToRestored(deferred = [], restored = [], id, now = new Date()) {
    const { deferred: nextDeferred, restoredItem } = restoreDeferredEntry(deferred, id, now);
    if (!restoredItem) {
      return {
        deferred: nextDeferred,
        restored: restored.slice(),
        restoredItem: null,
      };
    }

    const nextRestoredItem = {
      id: restoredItem.id,
      url: restoredItem.url,
      title: restoredItem.title,
      savedAt: restoredItem.savedAt,
      restoredAt: toIsoString(now),
      isRestored: true,
    };

    return {
      deferred: nextDeferred,
      restored: restored.concat(nextRestoredItem),
      restoredItem: nextRestoredItem,
    };
  }

  function moveRestoredEntryToDeferred(restored = [], deferred = [], id) {
    const restoredItem = restored.find(item => item.id === id);
    if (!restoredItem) {
      return {
        restored: restored.slice(),
        deferred: deferred.slice(),
      };
    }

    const nextDeferredItem = {
      id: restoredItem.id,
      url: restoredItem.url,
      title: restoredItem.title,
      savedAt: restoredItem.savedAt || restoredItem.restoredAt || new Date().toISOString(),
      completed: false,
      dismissed: false,
    };

    return {
      restored: removeRestoredEntry(restored, id),
      deferred: deferred.concat(nextDeferredItem),
    };
  }

  function removeRestoredEntry(restored = [], id) {
    return restored.filter(item => item.id !== id);
  }

  function mergeDisplayTabs(openTabs = [], restored = []) {
    return openTabs.concat(
      restored.map(item => ({
        ...item,
        restoredId: item.id,
        id: `restored-${item.id}`,
        active: false,
        windowId: null,
        isRestored: true,
      })),
    );
  }

  function renderDeferredActions(item) {
    const id = escapeAttr(typeof item === 'string' ? item : (item?.id || ''));
    return `
      <button type="button" class="deferred-dismiss deferred-restore-icon" data-action="restore-deferred" data-deferred-id="${id}" title="Undo save">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h10.5a6 6 0 0 1 0 12H9" /></svg>
      </button>`;
  }

  const api = {
    saveDeferredEntry,
    splitVisibleDeferredTabs,
    completeDeferredEntry,
    dismissDeferredEntry,
    restoreDeferredEntry,
    moveDeferredEntryToRestored,
    moveRestoredEntryToDeferred,
    removeRestoredEntry,
    removeDeferredEntry,
    mergeDisplayTabs,
    renderDeferredActions,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.TabOutSavedTabs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
