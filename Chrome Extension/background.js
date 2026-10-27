const DEFAULT_BACKEND_URL =
  "https://ai-image-detector-backend--rngari.replit.app";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "check-ai-image",
    title: "Check if AI-generated",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "check-ai-image" || !info.srcUrl || !tab?.id) return;
  detectImage(info.srcUrl).then((result) => {
    chrome.tabs
      .sendMessage(tab.id, { type: "SHOW_DETECTION_TOAST", result })
      .catch(() => {});
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "DETECT_IMAGE") return false;
  detectImage(message.imageUrl).then(sendResponse);
  return true;
});

async function detectImage(imageUrl) {
  const { backendUrl } = await chrome.storage.sync.get(["backendUrl"]);
  const url = backendUrl || DEFAULT_BACKEND_URL;

  // 8-second timeout so requests don't hang if Replit server is sleeping
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      return { error: `Backend error (${res.status}): ${text}` };
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { error: "Server timed out. It might be waking up—please try again in a few seconds." };
    }
    return { error: `Could not reach backend: ${err.message}` };
  }
}