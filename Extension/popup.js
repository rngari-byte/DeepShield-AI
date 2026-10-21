const hostnameLabel = document.getElementById("hostname-label");
const badgeToggle = document.getElementById("badge-toggle");
const backendInput = document.getElementById("backendUrl");
const status = document.getElementById("status");

const DEFAULT_ON_SITES = [
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "cnn.com",
  "www.cnn.com",
  "google.com",
  "www.google.com"
];

let currentHostname = null;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) {
    hostnameLabel.textContent = "no active site";
    badgeToggle.disabled = true;
    return;
  }
  try {
    currentHostname = new URL(tab.url).hostname;
    hostnameLabel.textContent = currentHostname;
  } catch {
    hostnameLabel.textContent = "this page";
    badgeToggle.disabled = true;
    return;
  }
  chrome.storage.sync.get(["badgeSettings"], ({ badgeSettings }) => {
    const settings = badgeSettings || {};
    badgeToggle.checked =
      currentHostname in settings
        ? settings[currentHostname]
        : DEFAULT_ON_SITES.some((domain) => currentHostname.includes(domain));
  });
});

badgeToggle.addEventListener("change", () => {
  if (!currentHostname) return;
  chrome.storage.sync.get(["badgeSettings"], ({ badgeSettings }) => {
    const settings = { ...(badgeSettings || {}) };
    settings[currentHostname] = badgeToggle.checked;
    chrome.storage.sync.set({ badgeSettings: settings });
  });
});

chrome.storage.sync.get(["backendUrl"], ({ backendUrl }) => {
  if (backendUrl) backendInput.value = backendUrl;
});

document.getElementById("save").addEventListener("click", () => {
  const value = backendInput.value.trim();
  chrome.storage.sync.set({ backendUrl: value }, () => {
    status.textContent = "Saved.";
    setTimeout(() => (status.textContent = ""), 1500);
  });
});