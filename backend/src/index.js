import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { getTranscriptFromYouTubeUrl, isYouTubeUrl } from "./youtube.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!process.env.OPENAI_API_KEY) {
  console.warn("Missing OPENAI_API_KEY. Add it in backend/.env before starting the server.");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

    console.log("Received /api/study request. Input length:", rawInput.length);

    if (isYouTubeUrl(rawInput)) {
      console.log("Detected YouTube URL. Attempting transcript fetch...");
      studyText = await getTranscriptFromYouTubeUrl(rawInput);
      console.log("Transcript fetched successfully. Transcript length:", studyText.length);
    }

    const [summary, keyPoints, quiz] = await Promise.all([
      generateSummary(studyText),
      generateKeyPoints(studyText),
      generateQuiz(studyText),
    ]);

    res.json({
      summary,
      keyPoints,
      quiz,
    });
  } catch (error) {
    console.error("StudyFlow route error:", error.message);
    const isTranscriptError = error.message.includes("Transcript") || error.message.includes("YouTube");

    res.status(isTranscriptError ? 400 : 500).json({
      error: isTranscriptError
        ? error.message
        : "Something went wrong while generating study material.",
    });
  }
});

async function generateSummary(text) {
  try {
    console.log("Generating summary...");

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are an expert study assistant. Write clear, simple, accurate study material with no filler.",
        },
        {
          role: "user",
          content: `Task: Create a short summary of the study material below.

Instructions:
- Return only valid JSON
- Use simple language
- Keep it short and clear
- Focus only on the main idea

Study material:
${text}

Return JSON in this exact format:
{
  "summary": "..."
}`,
        },
      ],
    });

    const parsed = safeJsonParse(response.output_text);
    const summary = parsed?.summary?.trim();

    if (!summary) {
      throw new Error("Summary response was empty.");
    }

    console.log("Summary generated successfully.");
    return summary;
  } catch (error) {
    console.error("generateSummary error:", error.message);
    throw new Error("Failed to generate summary.");
  }
}

async function generateKeyPoints(text) {
  try {
    console.log("Generating key points...");

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are an expert study assistant. Extract the most important ideas and present them clearly.",
        },
        {
          role: "user",
          content: `Task: Extract 5 key points from the study material below.

Instructions:
- Return only valid JSON
- Return exactly 5 key points
- Keep each point short and clear
- Use simple language
- Do not include an introduction or conclusion

Study material:
${text}

Return JSON in this exact format:
{
  "keyPoints": ["...", "...", "...", "...", "..."]
}`,
        },
      ],
    });

    const parsed = safeJsonParse(response.output_text);
    const keyPoints = parsed?.keyPoints
      ?.map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!keyPoints || keyPoints.length === 0) {
      throw new Error("Key points response was empty.");
    }

    console.log("Key points generated successfully.");
    return keyPoints;
  } catch (error) {
    console.error("generateKeyPoints error:", error.message);
    throw new Error("Failed to generate key points.");
  }
}

async function generateQuiz(text) {
  try {
    console.log("Generating quiz...");

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are an expert study assistant. Create simple quiz questions that help a student review key ideas.",
        },
        {
          role: "user",
          content: `Task: Create a quiz based on the study material below.

Instructions:
- Create exactly 5 quiz questions
- Keep questions clear and beginner-friendly
- Give exactly 4 answer options for each question
- Set "answer" to the exact correct option text
- Return only valid JSON

Return JSON in this exact format:
{
  "quiz": [
    {
      "question": "Question 1?",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}

Study material:
${text}`,
        },
      ],
    });

    const parsed = safeJsonParse(response.output_text);

    if (!parsed || !Array.isArray(parsed.quiz)) {
      throw new Error("Quiz response was not valid JSON.");
    }

    const quiz = parsed.quiz
      .slice(0, 5)
      .map((item) => ({
        question: String(item.question || "").trim(),
        options: Array.isArray(item.options)
          ? item.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
          : [],
        answer: String(item.answer || "").trim(),
      }))
      .filter((item) => item.question && item.options.length === 4 && item.answer);

    if (quiz.length === 0) {
      throw new Error("Quiz response did not contain usable questions.");
    }

    console.log("Quiz generated successfully.");
    return quiz;
  } catch (error) {
    console.error("generateQuiz error:", error.message);
    throw new Error("Failed to generate quiz.");
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
app.get("/", (req, res) => {
  res.send("StudyFlow backend is running 🚀");
});
app.listen(port, () => {
  console.log(`StudyFlow backend running on http://localhost:${port}`);
});
