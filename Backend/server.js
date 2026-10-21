// server.js
// A small server that sits between the browser extension and Hive AI's
// detection API. Keeping this on the server (not the extension) keeps the
// Hive API key private.

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const HIVE_API_KEY = process.env.HIVE_API_KEY;
const HIVE_ENDPOINT = "https://api.thehive.ai/api/v2/task/sync";

if (!HIVE_API_KEY) {
  console.warn(
    "WARNING: HIVE_API_KEY is not set. Copy .env.example to .env and add your key."
  );
}

app.post("/detect", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }

  try {
    const hiveResponse = await fetch(HIVE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Token ${HIVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!hiveResponse.ok) {
      const text = await hiveResponse.text();
      return res
        .status(502)
        .json({ error: `Hive API error (${hiveResponse.status}): ${text}` });
    }

    const data = await hiveResponse.json();
    const result = simplifyHiveResponse(data);

    if (!result) {
      return res
        .status(502)
        .json({ error: "Unexpected response shape from Hive API" });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Hive's raw response is deeply nested and includes many classes (which AI
// model generated the image, deepfake face scores, etc). For the extension
// badge we only need: is it AI-generated, and how confident is the model.
function simplifyHiveResponse(data) {
  try {
    const classes =
      data.status[0].response.output[0].classes; // array of {class, score}

    const aiGenerated = classes.find((c) => c.class === "ai_generated");
    const notAiGenerated = classes.find((c) => c.class === "not_ai_generated");

    if (!aiGenerated || !notAiGenerated) return null;

    const isAi = aiGenerated.score > notAiGenerated.score;
    return {
      label: isAi ? "ai_generated" : "not_ai_generated",
      confidence: isAi ? aiGenerated.score : notAiGenerated.score,
    };
  } catch {
    return null;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI image detection backend running on http://localhost:${PORT}`);
});
