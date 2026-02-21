require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();

// =====================================
// ENVIRONMENT VARIABLES
// =====================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY not found");
}

// =====================================
// INITIALIZE GROQ
// =====================================

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

// =====================================
// MIDDLEWARE
// =====================================

app.use(express.json());

// ===== CORS CONFIG (DEV + PRODUCTION) =====

// ===== CORS CONFIG (DEV + PRODUCTION) =====

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "vercel-deply1-a6gl-mtz2xn52b-meignanamsrinivasans-projects.vercel.app", // 🔥 CHANGE THIS
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman / server-to-server

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ SAFE preflight handler (no wildcard crash)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// =====================================
// HELPER FUNCTION
// =====================================

async function callGroq(messages, temperature = 0.7, max_tokens = 1000) {
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("🔥 Groq Error:", error.message);

    if (error.message?.toLowerCase().includes("authentication")) {
      throw { status: 401, message: "Invalid Groq API Key" };
    }

    if (error.message?.toLowerCase().includes("rate limit")) {
      throw { status: 429, message: "Rate limit exceeded" };
    }

    throw { status: 500, message: "Groq API failed" };
  }
}

function extractJSONFromText(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (err) {}
  return {};
}

// =====================================
// ROUTES
// =====================================

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Extract Options
app.post("/api/extract-options", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const messages = [
      {
        role: "system",
        content: `Extract video parameters from the prompt.
Return ONLY JSON with:
duration, language, platform, size (Landscape/Vertical/Square), category.`,
      },
      { role: "user", content: prompt },
    ];

    const responseText = await callGroq(messages, 0.1, 500);
    let extracted = extractJSONFromText(responseText);

    res.json({
      duration: extracted.duration || "",
      language: extracted.language || "",
      platform: extracted.platform || "",
      size: extracted.size || "",
      category: extracted.category || "",
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Enhance Prompt
app.post("/api/enhance-prompt", async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const optionsText = `
Duration: ${options?.duration || "Not specified"}
Language: ${options?.language || "Not specified"}
Platform: ${options?.platform || "Not specified"}
Size: ${options?.size || "Not specified"}
Category: ${options?.category || "Not specified"}
`;

    const messages = [
      {
        role: "system",
        content: `Enhance the prompt to be cinematic and production-ready.
Return ONLY the enhanced prompt.`,
      },
      {
        role: "user",
        content: `Original Prompt:\n${prompt}\n\nParameters:\n${optionsText}`,
      },
    ];

    const enhanced = await callGroq(messages, 0.7, 1000);

    res.json({ enhanced_prompt: enhanced });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Generate Script
app.post("/api/generate-script", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const messages = [
      {
        role: "system",
        content: `Generate a cinematic video script with 5-8 scenes.

Format:
TITLE:
SCENE 1:
VISUAL:
NARRATION:
MOOD:
DURATION:`,
      },
      { role: "user", content: prompt },
    ];

    const script = await callGroq(messages, 0.8, 1500);

    res.json({ script });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// =====================================
// LOCAL SERVER (ONLY FOR DEVELOPMENT)
// =====================================

if (process.env.NODE_ENV !== "production") {
  const PORT = 8000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// =====================================
// EXPORT FOR VERCEL
// =====================================

module.exports = app;