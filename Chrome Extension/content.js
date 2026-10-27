// Replace with your active Replit production deployment URL
const BACKEND_URL = "https://ai-image-detector-backend--rngari.replit.app";

const MIN_IMAGE_SIZE = 180; // Minimum dimension threshold (px)
const processedImages = new WeakSet();
const resultCache = new Map();

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

// Dynamically inject badge styles into page DOM
function injectStyles() {
  if (document.getElementById("ai-checker-styles")) return;
  const style = document.createElement("style");
  style.id = "ai-checker-styles";
  style.textContent = `
    .ai-checker-badge {
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 2147483647 !important;
      background: rgba(15, 23, 42, 0.85) !important;
      color: #38bdf8 !important;
      border: 1px solid #38bdf8 !important;
      padding: 4px 10px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      font-weight: bold !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      cursor: pointer !important;
      backdrop-filter: blur(4px) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
      transition: all 0.2s ease !important;
      user-select: none !important;
    }
    .ai-checker-badge:hover {
      transform: scale(1.05) !important;
      background: rgba(15, 23, 42, 0.98) !important;
    }
    .ai-checker-loading {
      color: #fbbf24 !important;
      border-color: #fbbf24 !important;
    }
    .ai-checker-flagged {
      background: rgba(220, 38, 38, 0.9) !important;
      color: #ffffff !important;
      border-color: #ef4444 !important;
    }
    .ai-checker-clear {
      background: rgba(16, 185, 129, 0.9) !important;
      color: #ffffff !important;
      border-color: #10b981 !important;
    }
    .ai-checker-error {
      background: rgba(185, 28, 28, 0.9) !important;
      color: #ffffff !important;
      border-color: #f87171 !important;
    }
    #ai-checker-toast {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      padding: 12px 18px !important;
      border-radius: 8px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #ffffff !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
      animation: ai-toast-fade 0.3s ease-in-out !important;
    }
    .ai-checker-toast-flagged { background: #dc2626 !important; }
    .ai-checker-toast-clear { background: #059669 !important; }
    .ai-checker-toast-error { background: #b91c1c !important; }
    @keyframes ai-toast-fade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function shouldSkipImage(img) {
  const rect = img.getBoundingClientRect();
  const width = img.naturalWidth || rect.width;
  const height = img.naturalHeight || rect.height;

  if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) return true;

  const src = img.currentSrc || img.src;
  if (!src || src.startsWith("data:") || src.endsWith(".svg")) return true;

  if (
    img.closest('canvas') || 
    (img.alt && img.alt.toLowerCase().includes("profile picture")) ||
    img.closest('header')
  ) {
    return true;
  }

  return false;
}

function createBadge(img) {
  injectStyles();
  const currentSrc = img.currentSrc || img.src;
  
  let parent = img.parentElement;
  if (!parent) return;

  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }

  let badge = parent.querySelector(".ai-checker-badge");

  if (!badge) {
    badge = document.createElement("div");
    badge.className = "ai-checker-badge";
    badge.textContent = "AI?";
    badge.title = "Click to scan image with DeepShield AI";

    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const latestUrl = img.currentSrc || img.src;
      runDetection(latestUrl, badge);
    });

    parent.appendChild(badge);
  } else {
    if (badge.getAttribute("data-ai-checker-src") !== currentSrc) {
      badge.textContent = "AI?";
      badge.title = "Click to scan image with DeepShield AI";
      badge.className = "ai-checker-badge";
    }
  }

  badge.setAttribute("data-ai-checker-src", currentSrc);
}

function runDetection(imageUrl, badge) {
  if (resultCache.has(imageUrl)) {
    displayResult(badge, resultCache.get(imageUrl));
    return;
  }

  badge.textContent = "…";
  badge.className = "ai-checker-badge ai-checker-loading";

  fetch(`${BACKEND_URL}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl })
  })
    .then((res) => res.json())
    .then((data) => {
      badge.classList.remove("ai-checker-loading");
      if (data && !data.error) {
        resultCache.set(imageUrl, data);
        displayResult(badge, data);
      } else {
        displayResult(badge, { error: data?.error || "Detection failed" });
      }
    })
    .catch((err) => {
      badge.classList.remove("ai-checker-loading");
      displayResult(badge, { error: "Network error reaching Replit server" });
    });
}

function displayResult(badge, response) {
  if (!response || response.error) {
    badge.textContent = "!";
    badge.title = response?.error || "Detection failed";
    badge.className = "ai-checker-badge ai-checker-error";
    return;
  }

  // Compatible with server.js response schema
  const pct = response.score !== undefined ? response.score : Math.round((response.confidence || 0) * 100);
  const isAI = response.label === "AI-Generated" || response.label === "ai_generated";
  const provider = response.provider || "DeepShield";

  if (isAI) {
    badge.textContent = `AI ${pct}%`;
    badge.className = "ai-checker-badge ai-checker-flagged";
  } else {
    badge.textContent = `Real ${pct}%`;
    badge.className = "ai-checker-badge ai-checker-clear";
  }

  badge.title = `Confidence: ${pct}% (${response.label}) - Provider: ${provider}`;
}

function scanForImages() {
  document.querySelectorAll("img").forEach((img) => {
    const currentSrc = img.currentSrc || img.src;
    const previousSrc = img.getAttribute("data-ai-last-src");

    if (processedImages.has(img) && previousSrc === currentSrc) return;

    if (img.complete && (img.naturalWidth > 0 || img.width > 0)) {
      processedImages.add(img);
      img.setAttribute("data-ai-last-src", currentSrc);
      if (!shouldSkipImage(img)) createBadge(img);
    } else {
      img.addEventListener(
        "load",
        () => {
          processedImages.add(img);
          const newSrc = img.currentSrc || img.src;
          img.setAttribute("data-ai-last-src", newSrc);
          if (!shouldSkipImage(img)) createBadge(img);
        },
        { once: true }
      );
    }
  });
}

let badgeObserver = null;

function enableBadges() {
  if (badgeObserver) return;
  scanForImages();
  
  badgeObserver = new MutationObserver(scanForImages);
  badgeObserver.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ["src", "srcset"] 
  });
}

function disableBadges() {
  if (badgeObserver) {
    badgeObserver.disconnect();
    badgeObserver = null;
  }
  document.querySelectorAll(".ai-checker-badge").forEach((b) => b.remove());
}

function checkBadgeSetting() {
  const hostname = location.hostname;
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(["badgeSettings"], ({ badgeSettings }) => {
      const settings = badgeSettings || {};
      const isOn =
        hostname in settings
          ? settings[hostname]
          : DEFAULT_ON_SITES.some((domain) => hostname.includes(domain));
      if (isOn) {
        enableBadges();
      } else {
        disableBadges();
      }
    });
  } else {
    enableBadges();
  }
}

checkBadgeSetting();

if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.badgeSettings) {
      checkBadgeSetting();
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "SHOW_DETECTION_TOAST") return;
    showToast(message.result);
  });
}

function showToast(result) {
  const existing = document.getElementById("ai-checker-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "ai-checker-toast";

  if (result.error) {
    toast.textContent = `DeepShield AI: ${result.error}`;
    toast.className = "ai-checker-toast-error";
  } else {
    const pct = result.score !== undefined ? result.score : Math.round((result.confidence || 0) * 100);
    const isAI = result.label === "AI-Generated" || result.label === "ai_generated";
    toast.textContent = isAI
      ? `Likely AI-generated (${pct}%)`
      : `Likely authentic (${pct}%)`;
    toast.className = isAI
      ? "ai-checker-toast-flagged"
      : "ai-checker-toast-clear";
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}