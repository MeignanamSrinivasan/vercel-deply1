require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();

// ==========================================
// ENVIRONMENT
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const PORT = process.env.PORT || 8000;

if (!GROQ_API_KEY) {
  throw new Error("❌ GROQ_API_KEY not found in .env");
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-frontend.vercel.app",
    ],
    credentials: true,
  })
);

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function extractJSONFromText(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (err) {}
  return {};
}

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
    console.error("🔥 Groq API Error:", error.message);

    if (error.message.toLowerCase().includes("authentication")) {
      throw { status: 401, message: "Invalid Groq API Key" };
    }

    if (error.message.toLowerCase().includes("rate limit")) {
      throw { status: 429, message: "Rate limit exceeded" };
    }

    if (error.message.toLowerCase().includes("decommissioned")) {
      throw {
        status: 500,
        message: "Model deprecated. Update GROQ_MODEL in .env",
      };
    }

    throw { status: 500, message: error.message };
  }
}

// ==========================================
// ROUTES
// ==========================================

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Extract Options
app.post("/api/extract-options", async (req, res) => {
  try {
    const { prompt } = req.body;

    const messages = [
      {
        role: "system",
        content: `Extract video parameters from the prompt.
Return ONLY JSON with:
duration, language, platform, size (Landscape/Vertical/Square), category.
If not mentioned, use empty string.`,
      },
      { role: "user", content: prompt },
    ];

    const responseText = await callGroq(messages, 0.1, 500);
    let extracted = extractJSONFromText(responseText);

    if (!Object.keys(extracted).length) {
      try {
        extracted = JSON.parse(responseText);
      } catch {}
    }

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
        content: `You are an expert cinematic prompt engineer.
Enhance the prompt to be highly detailed and production-ready.
Return ONLY the enhanced prompt.`,
      },
      {
        role: "user",
        content: `
Original Prompt:
${prompt}

Parameters:
${optionsText}

Enhance it.
`,
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

    const messages = [
      {
        role: "system",
        content: `You are a professional cinematic script writer.

Generate a detailed video script in this format:

TITLE: [Title]

SCENE 1:
VISUAL:
NARRATION:
MOOD:
DURATION:

Include 5-8 scenes.
Make it cinematic and dramatic.`,
      },
      { role: "user", content: prompt },
    ];

    const script = await callGroq(messages, 0.8, 1500);
    res.json({ script });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});