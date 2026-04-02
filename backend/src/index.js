import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { getTranscriptFromYouTubeUrl, isYouTubeUrl } from "./youtube.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("StudyFlow backend is running 🚀");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/study", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text input is required." });
    }

    const rawInput = text.trim();
    let studyText = rawInput;

    console.log("Received request. Input length:", rawInput.length);

    if (isYouTubeUrl(rawInput)) {
      console.log("Detected YouTube URL. Fetching transcript...");
      studyText = await getTranscriptFromYouTubeUrl(rawInput);
      console.log("Transcript length:", studyText.length);
    }

    const result = await generateStudyMaterial(studyText);

    res.json(result);
  } catch (error) {
    console.error("StudyFlow route error:", error.message);

    const isTranscriptError =
      error.message.includes("Transcript") ||
      error.message.includes("YouTube");

    res.status(isTranscriptError ? 400 : 500).json({
      error: isTranscriptError
        ? error.message
        : "Something went wrong while generating study material.",
    });
  }
});

async function generateStudyMaterial(text) {
  try {
    console.log("Generating study material (single API call)...");

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are an expert study assistant. You generate clean, structured study guides.",
        },
        {
          role: "user",
          content: `
Task: Analyze the study material and generate:

1. A short summary
2. Exactly 5 key points
3. Exactly 5 multiple-choice quiz questions

Rules:
- Return ONLY valid JSON
- Keep language simple and clear
- No extra commentary
- Each quiz question must have 4 options and one correct answer

Return JSON in exactly this format:

{
  "summary": "...",
  "keyPoints": ["...", "...", "...", "...", "..."],
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}

Study material:
${text}
          `,
        },
      ],
    });

    const parsed = safeJsonParse(response.output_text);

    if (!parsed) {
      throw new Error("Failed to parse AI response.");
    }

    // Basic validation
    if (
      !parsed.summary ||
      !Array.isArray(parsed.keyPoints) ||
      !Array.isArray(parsed.quiz)
    ) {
      throw new Error("AI response missing required fields.");
    }

    return {
      summary: String(parsed.summary).trim(),
      keyPoints: parsed.keyPoints
        .map((p) => String(p).trim())
        .filter(Boolean)
        .slice(0, 5),
      quiz: parsed.quiz.slice(0, 5).map((q) => ({
        question: String(q.question || "").trim(),
        options: Array.isArray(q.options)
          ? q.options.map((o) => String(o).trim()).slice(0, 4)
          : [],
        answer: String(q.answer || "").trim(),
      })),
    };
  } catch (error) {
    console.error("generateStudyMaterial error:", error.message);
    throw new Error("Failed to generate study material.");
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
