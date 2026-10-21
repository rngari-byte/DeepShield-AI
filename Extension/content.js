const MIN_IMAGE_SIZE = 180; // Adjusted threshold to catch post images rendered smaller
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

function shouldSkipImage(img) {
  // 1. Check natural dimensions or actual rendered element size
  const rect = img.getBoundingClientRect();
  const width = img.naturalWidth || rect.width;
  const height = img.naturalHeight || rect.height;

  if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) return true;

  // 2. Skip data URLs, SVGs, or missing sources
  const src = img.currentSrc || img.src;
  if (!src || src.startsWith("data:") || src.endsWith(".svg")) return true;

  // 3. Skip profile avatars, story circles, and navigation headers explicitly
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
  const currentSrc = img.currentSrc || img.src;
  
  // Find suitable parent element to attach the badge
  let parent = img.parentElement;
  if (!parent) return;

  // Ensure parent container can anchor positioned elements
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }

  // Check if container already has a badge
  let badge = parent.querySelector(".ai-checker-badge");

  if (!badge) {
    badge = document.createElement("div");
    badge.className = "ai-checker-badge";
    badge.textContent = "AI?";
    badge.title = "Click to check if this image is AI-generated";

    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const latestUrl = img.currentSrc || img.src;
      runDetection(latestUrl, badge);
    });

    parent.appendChild(badge);
  } else {
    // Reset badge state if the carousel/slide changed image URL
    if (badge.getAttribute("data-ai-checker-src") !== currentSrc) {
      badge.textContent = "AI?";
      badge.title = "Click to check if this image is AI-generated";
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
  badge.classList.add("ai-checker-loading");

  chrome.runtime.sendMessage({ type: "DETECT_IMAGE", imageUrl }, (response) => {
    badge.classList.remove("ai-checker-loading");
    if (response && !response.error) {
      resultCache.set(imageUrl, response);
    }
    displayResult(badge, response);
  });
}

function displayResult(badge, response) {
  if (!response || response.error) {
    badge.textContent = "!";
    badge.title = response?.error || "Detection failed";
    badge.classList.add("ai-checker-error");
    return;
  }

  const { label, confidence } = response;
  const pct = Math.round(confidence * 100);

  if (label === "ai_generated") {
    badge.textContent = `AI ${pct}%`;
    badge.classList.add("ai-checker-flagged");
  } else {
    badge.textContent = `Real ${pct}%`;
    badge.classList.add("ai-checker-clear");
  }

  badge.title = `Confidence: ${pct}% (${label.replace("_", " ")})`;
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
}

checkBadgeSetting();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.badgeSettings) {
    checkBadgeSetting();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "SHOW_DETECTION_TOAST") return;
  showToast(message.result);
});

function showToast(result) {
  const existing = document.getElementById("ai-checker-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "ai-checker-toast";

  if (result.error) {
    toast.textContent = `AI Image Checker: ${result.error}`;
    toast.classList.add("ai-checker-toast-error");
  } else {
    const pct = Math.round(result.confidence * 100);
    toast.textContent =
      result.label === "ai_generated"
        ? `Likely AI-generated (${pct}%)`
        : `Likely real (${pct}%)`;
    toast.classList.add(
      result.label === "ai_generated"
        ? "ai-checker-toast-flagged"
        : "ai-checker-toast-clear"
    );
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}