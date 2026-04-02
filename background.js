// The Court Jester — Service Worker
// Sets default storage values on first install.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["cj_enabled", "cj_worse"], (result) => {
    const defaults = {};
    if (result.cj_enabled === undefined) defaults.cj_enabled = false;
    if (result.cj_worse === undefined) defaults.cj_worse = false;
    if (Object.keys(defaults).length) chrome.storage.local.set(defaults);
  });
});
