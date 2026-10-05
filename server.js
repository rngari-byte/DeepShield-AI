// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET;
console.log("Sightengine creds loaded:", SIGHTENGINE_API_USER && SIGHTENGINE_API_SECRET ? "yes" : "MISSING");

const SIGHTENGINE_ENDPOINT = "https://api.sightengine.com/1.0/check.json";

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/detect", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "genai",
      api_user: SIGHTENGINE_API_USER,
      api_secret: SIGHTENGINE_API_SECRET,
    });

    const sightengineResponse = await fetch(`${SIGHTENGINE_ENDPOINT}?${params}`);

    if (!sightengineResponse.ok) {
      const text = await sightengineResponse.text();
      return res.status(502).json({ error: `Sightengine API error (${sightengineResponse.status}): ${text}` });
    }

    const data = await sightengineResponse.json();

    if (data.status !== "success" || !data.type || typeof data.type.ai_generated !== "number") {
      return res.status(502).json({ error: `Unexpected response: ${JSON.stringify(data)}` });
    }

    const aiScore = data.type.ai_generated;
    const isAi = aiScore > 0.5;

    res.json({
      label: isAi ? "ai_generated" : "not_ai_generated",
      confidence: isAi ? aiScore : 1 - aiScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI image detection backend running on http://localhost:${PORT}`);
});
