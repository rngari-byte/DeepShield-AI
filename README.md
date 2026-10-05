# Senior-Project-
This semester, I have the opportunity to develop a project of my choice. Building on my summer research on deepfake image detection, I plan to develop a related system that expands my knowledge and skills in artificial intelligence.

**Renee Ngari** | University of North Carolina at Charlotte  
College of Computing and Informatics | Undergraduate Research

## Overview
This project is a browser extension designed to help users identify manipulated or AI-generated images while browsing social media. The extension can be used across different social media platforms and allows users to check an image without leaving the website they are currently using.

The goal is to make deepfake and image manipulation detection easier and more accessible to everyday users. Instead of requiring users to upload an image to a separate website, the extension can analyze an image directly from a social media page and provide a simple result indicating whether the image is likely authentic, AI-generated, or manipulated.

### Key Features

Key Features
Image Detection: Uses a deepfake detection model to analyze images.
Browser Integration: Allows users to check images directly while browsing social media.
Authenticity Score: Provides a percentage-based prediction such as “82% likely AI-generated.”
Visual Feedback: Highlights areas of an image that may contain signs of manipulation.
Simple Results: Uses clear indicators such as Likely Authentic, Uncertain, or Likely Manipulated.

---

## Technology Stack

JavaScript — Chrome extension logic (content script, background service worker)
HTML/CSS — extension popup and on-page badge UI
Chrome Extension API (Manifest V3) — browser integration on Instagram and TikTok (web)
Node.js / Express — backend server that mediates between the extension and the detection API
Hive AI Deepfake/AI-Generated Image Detection API — provides the actual detection model. Based on my summer research comparing five detectors (DFBench, Hive AI, SID-Set, Logistic Regression, Random Forest) under realistic social-media-style transformations, CNN-based detectors like Hive AI outperformed traditional machine learning models, so the project uses an existing, maintained CNN-based detector rather than training one from scratch this semester.
Replit — hosts the backend server so it's reachable from the extension without needing local infrastructure

---

## How It Works

Image Detection on the Page: A content script scans the page for images as the user scrolls Instagram or TikTok (web), and attaches a small "AI?" badge to each sufficiently large image.
User-Initiated Check: The user clicks the badge on any image they want checked. This is intentional — the extension does not automatically scan every image, both to control API costs and to give the user control over what gets analyzed.
Request Routing: Clicking the badge sends the image URL to the extension's background service worker, which forwards it to a backend server (hosted on Replit) rather than calling the detection API directly. This keeps the API key private and off the client side.
Deepfake Detection: The backend forwards the image to the Hive AI API, which analyzes it and returns classification scores. The backend simplifies this into a single label (ai_generated / not_ai_generated) and confidence percentage.
Result Display: The badge updates in place to show the result, e.g., "AI 82%" or "Real 91%," with the confidence percentage shown as a tooltip.

---

#Progress Log

Week 1–2: Extension skeleton and backend wiring
Built the Chrome extension (Manifest V3): content script for image detection and badge UI, background service worker for message passing, popup for settings.
Built the Node/Express backend and integrated Hive AI's /task/sync detection endpoint.
Verified the backend runs correctly, and the /detect endpoint responds as expected.
Deployed the backend to Replit (chosen due to local development constraints on a Chromebook) at a public URL, avoiding the need for a local Node.js installation.
Loaded the extension into Chrome via Developer Mode and confirmed it installs without errors.
Currently debugging: the badge is not yet appearing on Instagram — narrowing down whether the content script is running via console logging; next step in the plan.

Known issues / in progress
Confirming the content script actually loads on Instagram's page (added a console log for verification).
Need to confirm badges appear once the content script is confirmed running, then test the full click → detect → result flow end-to-end.
www. vs non-www. URL variants for Instagram/TikTok have already been added to the manifest to avoid missed matches.

Known issues / in progress Confirming the content script actually loads on Instagram's page (added a console log for verification). Need to confirm badges appear once the content script is confirmed running, then test the full click → detect → result flow end-to-end. www. vs non-www. URL variants for Instagram/TikTok have already been added to the manifest to avoid missed matches.

Week 3-4: Bug fix and a mid-project pivot Found and fixed the badge bug: the content script was marking images as "already processed" before actually deciding whether to badge them, so every single badge was being silently skipped. Restructured the image-tracking logic so the badge decision happens first. Confirmed working — the "AI?" badge now appears correctly across Instagram, including on posts, stories, and profile pictures.

Hive AI authentication issue: after fixing the badge, testing surfaced a persistent "Invalid Auth Token" error from Hive's API. This held up across three separate fix attempts — generating a correct V3 (not V2) API key, rewriting the backend to match Hive's actual V3 request/response format, and exposing the correct port on the Replit deployment. The error pattern (a correctly-formatted key being rejected every time, while Hive's own logged-in Playground worked fine) pointed to an account/project permissions issue on Hive's side rather than something fixable from the client.

Decision: switched the backend's detection API from Hive AI to Sightengine's AI-Generated Image Detection API (genai model), which uses a simpler API user/secret authentication scheme. This worked correctly once configured, without the account-level issues hit with Hive.

End-to-end pipeline confirmed working: clicking the "AI?" badge on a real Instagram image now returns a live confidence score from the backend, routed through Sightengine.

Updated known issues / in progress Error handling returns a visible "!" on failure, but the underlying error message shown to the user could be clearer. Accuracy testing against transformed images (screenshots, compression, resizing), per the original weeks 7–8 plan, has not started yet. The Technology Stack and How It Works sections above still describe the original Hive AI integration; functionally, Sightengine now fills that role using the same backend structure (request routing, confidence score simplification) described there.

