# DeepShield-Ai

This semester, I have the opportunity to develop a project of my choice. Building on my summer research on deepfake image detection, I plan to develop a related system that expands my knowledge and skills in artificial intelligence.

**Renee Ngari** | University of North Carolina at Charlotte  
**College of Computing and Informatics** | Undergraduate Research

---

## 📌 Overview

This project is a browser extension designed to help users identify manipulated or AI-generated images while browsing social media. The extension can be used across different social media platforms and allows users to check an image without leaving the website they are currently using.

The goal is to make deepfake and image manipulation detection easier and more accessible to everyday users. Instead of requiring users to upload an image to a separate website, the extension can analyze an image directly from a social media page and provide a simple result indicating whether the image is likely authentic, AI-generated, or manipulated.

### Key Features

* **Image Detection:** Uses a deepfake detection model to analyze images.
* **Browser Integration:** Allows users to check images directly while browsing social media.
* **Authenticity Score:** Provides a percentage-based prediction such as *“82% likely AI-generated.”*
* **Visual Feedback:** Highlights areas of an image that may contain signs of manipulation.
* **Simple Results:** Uses clear indicators such as *Likely Authentic*, *Uncertain*, or *Likely Manipulated*.

---

## 🛠️ Technology Stack

| Technology | Role / Usage |
| :--- | :--- |
| **JavaScript** | Core Chrome extension logic (content scripts, background service workers) |
| **HTML / CSS** | Extension popup UI and on-page badge interface |
| **Chrome Extension API (Manifest V3)** | Browser integration on web platforms like Instagram and TikTok |
| **Node.js / Express** | Backend server that mediates between the extension and the detection API |
| **Sightengine API (`genai` model)** | Detection model backend *(migrated from Hive AI)* |
| **Replit** | Hosts the backend server for public accessibility without local infrastructure |

> **Tech Choice Context:** Based on my summer research comparing five detectors (*DFBench, Hive AI, SID-Set, Logistic Regression, Random Forest*) under realistic social-media-style transformations, CNN-based detectors like Hive AI and Sightengine outperformed traditional machine learning models. Therefore, this project utilizes an existing, maintained CNN-based detector API rather than training one from scratch this semester.

---

## ⚙️ How It Works

1. **Image Detection on the Page:** A content script scans the page for images as the user scrolls Instagram or TikTok (web), attaching a small **"AI?"** badge to each eligible image.
2. **User-Initiated Check:** The user clicks the badge on an image they want checked. *This is intentional*—the extension does not automatically scan every image to control API costs and give the user control over what gets analyzed.
3. **Request Routing:** Clicking the badge sends the image URL to the extension's background service worker, which forwards it to a backend server (hosted on Replit) rather than calling the detection API directly. This keeps the API key private and off the client side.
4. **Deepfake Detection:** The backend forwards the image to the detection API, which analyzes it and returns classification scores. The backend simplifies this into a single label (`ai_generated` / `not_ai_generated`) and a confidence percentage.
5. **Result Display:** The badge updates in place to show the result (e.g., `AI 82%` or `Real 91%`), with the exact confidence percentage shown as a tooltip.

---

## 📈 Progress Log

### Week 1–2: Extension Skeleton & Backend Wiring

* Built the Chrome extension (**Manifest V3**): content script for image detection and badge UI, background service worker for message passing, and a popup for settings.
* Built the Node.js/Express backend and integrated Hive AI's `/task/sync` detection endpoint.
* Verified the backend runs correctly and the `/detect` endpoint responds as expected.
* Deployed the backend to **Replit** (chosen due to local development constraints on a Chromebook) at a public URL, avoiding the need for local Node.js installation.
* Loaded the extension into Chrome via **Developer Mode** and confirmed it installs without errors.
* **Debugging Focus:** Badge was not appearing on Instagram; narrowed down content script execution via console logging.

#### Known Issues / In Progress (Weeks 1–2)
* [x] Confirming content script loads on Instagram's page.
* [x] Confirm badges appear once the content script runs, then test full click $\rightarrow$ detect $\rightarrow$ result flow end-to-end.
* [x] `www.` vs `non-www.` URL variants for Instagram/TikTok added to manifest to avoid missed matches.

---

### Week 3–4: Bug Fix & Mid-Project Pivot

* **Badge Bug Fixed:** Found and resolved the badge issue. The content script was marking images as *"already processed"* before deciding whether to badge them, causing badges to be silently skipped. Restructured image-tracking logic so the badge decision happens first. Confirmed working across Instagram posts, stories, and profile pictures.
* **Hive AI Authentication Issue:** Testing surfaced a persistent `"Invalid Auth Token"` error from Hive's API. Despite three fix attempts (*generating new V3 keys, rewriting backend payload structures, exposing correct Replit ports*), Hive's API consistently rejected requests while their logged-in Playground worked. This indicated an account/project permissions issue on Hive's side rather than a client-side code bug.
* **API Pivot:** Switched the backend's detection API from **Hive AI** to **Sightengine's AI-Generated Image Detection API** (`genai` model), which uses a simpler user/secret authentication scheme. This resolved the blocking issue immediately.
* **End-to-End Pipeline Confirmed:** Clicking the **"AI?"** badge on a real Instagram image now successfully returns a live confidence score routed through Sightengine.

> [!NOTE]
> **Pipeline Update:** The *Technology Stack* and *How It Works* sections describe the backend architecture. Functionally, **Sightengine** now replaces Hive AI while maintaining the same request routing and score-simplification pipeline.

#### Updated Known Issues / In Progress (Weeks 3–4)
* [ ] Error handling returns a visible `!` on failure, but the underlying error message shown to the user could be clearer.
* [ ] Accuracy testing against transformed images (*screenshots, compression, resizing*), per original weeks 7–8 plan, has not started yet.

---

### Week 5: Expanding Beyond Social Media & Strengthening Extension (v0.2.0)

* **Works on Any Website:** Expanded functionality beyond Instagram and TikTok. Added a right-click context menu option (*"Check if AI-generated"*) that works on any web image (news sites, search engines, etc.) with results displayed in a top-page banner.
* **Optional Badges Per Site:** Badges appear automatically on Instagram, TikTok, CNN, and Google Images, remaining off by default elsewhere to prevent page clutter. Users can toggle badges on/off per site via the extension popup menu.
* **Clutter Reduction & Performance Enhancements:**
  * Raised minimum image size thresholds and filtered out story rings, headers, button overlays, and profile pictures.
  * Added support for multi-photo carousel posts so each slide is checked independently.
  * Implemented a short-term client cache to serve repeat checks instantly without making duplicate backend API requests.
  * Added an 8-second request timeout to show clear messages during backend cold starts on free-tier hosting.
  * Raised badge layering (`z-index`) to keep badges visible over complex image containers.

#### Next Steps
* [ ] Conduct controlled accuracy testing with known real and AI-generated images (including resized, compressed, and screenshot variations).
* [ ] Add backend support for direct image file uploads to allow checking screenshots and session-locked social media links.
* [ ] Build a standalone web portal where users can paste URLs or drag-and-drop images to test them directly without installing the extension.

