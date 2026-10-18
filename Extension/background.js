// background.js
// Receives detection requests from content scripts and forwards them to
// our own backend server (which in turn calls the Hive AI-detection API).
// We never call Hive directly from the extension so the API key stays
// server-side, not exposed in extension code that anyone can inspect.

const DEFAULT_BACKEND_URL = "http://localhost:3000/detect";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "DETECT_IMAGE") return false;

  chrome.storage.sync.get(["backendUrl"], async ({ backendUrl }) => {
    const url = backendUrl || DEFAULT_BACKEND_URL;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: message.imageUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        sendResponse({ error: `Backend error (${res.status}): ${text}` });
        return;
      }

      const data = await res.json();
      sendResponse(data); // expects { label, confidence }
    } catch (err) {
      sendResponse({ error: `Could not reach backend: ${err.message}` });
    }
  });

  return true; // keep the message channel open for the async response
});
