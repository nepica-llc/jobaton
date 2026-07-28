import express from "express";
import cors from "cors";
import path from "node:path";
import { readCollection, writeCollection, upsert, remove, getSettings, saveSettings, getById } from "./storage.js";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";

const app = express();
const PORT = Number(process.env.API_PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, version: "1.0.0" });
});

// ---------------------------------------------------------------------------
// Settings (API key, preferences)
// ---------------------------------------------------------------------------
app.get("/api/settings", (_req, res) => {
  const settings = getSettings();
  // Never return the full API key to the client
  if (settings.openai_key) {
    settings.openai_key_masked = settings.openai_key.slice(0, 7) + "..." + settings.openai_key.slice(-4);
    delete settings.openai_key;
  }
  res.json({ ok: true, data: settings });
});

app.post("/api/settings", (req, res) => {
  saveSettings(req.body);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Resumes CRUD
// ---------------------------------------------------------------------------
app.get("/api/resumes", (_req, res) => {
  res.json({ ok: true, data: readCollection("resumes") });
});

app.get("/api/resumes/:id", (req, res) => {
  const item = getById("resumes", req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, data: item });
});

app.post("/api/resumes", (req, res) => {
  const resume = { id: uuid(), ...req.body };
  upsert("resumes", resume);
  res.json({ ok: true, data: resume });
});

app.put("/api/resumes/:id", (req, res) => {
  const resume = { ...req.body, id: req.params.id };
  upsert("resumes", resume);
  res.json({ ok: true, data: resume });
});

app.delete("/api/resumes/:id", (req, res) => {
  remove("resumes", req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Cover Letters CRUD
// ---------------------------------------------------------------------------
app.get("/api/cover-letters", (_req, res) => {
  res.json({ ok: true, data: readCollection("cover-letters") });
});

app.post("/api/cover-letters", (req, res) => {
  const cl = { id: uuid(), ...req.body, created_at: new Date().toISOString() };
  upsert("cover-letters", cl);
  res.json({ ok: true, data: cl });
});

app.delete("/api/cover-letters/:id", (req, res) => {
  remove("cover-letters", req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// AI helper — resolve API key from request body or server settings
// ---------------------------------------------------------------------------
function getOpenAIClient(bodyKey?: string): OpenAI | null {
  const key = bodyKey || getSettings().openai_key || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

// ---------------------------------------------------------------------------
// AI: Chat completion (generic endpoint used by all features)
// ---------------------------------------------------------------------------
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, apiKey } = req.body;
    const client = getOpenAIClient(apiKey);
    if (!client) {
      return res.status(400).json({ ok: false, error: "No API key configured. Go to Settings to add your OpenAI key." });
    }
    const completion = await client.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens || 4096,
    });
    const content = completion.choices[0]?.message?.content || "";
    res.json({
      ok: true,
      data: { content },
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error("[ai/chat]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI: Cover Letter
// ---------------------------------------------------------------------------
app.post("/api/ai/cover-letter", async (req, res) => {
  try {
    const { jobDescription, resumeText, tone, apiKey } = req.body;
    const client = getOpenAIClient(apiKey);
    if (!client) {
      return res.status(400).json({ ok: false, error: "No API key configured." });
    }
    const systemPrompt = `You are a professional cover letter writer. Write a compelling, personalized cover letter based on the resume and job description provided. Tone: ${tone || "professional"}. Output ONLY the cover letter text, no extra commentary.`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}` },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    res.json({ ok: true, data: { coverLetter: completion.choices[0]?.message?.content || "" }, usage: completion.usage });
  } catch (err: any) {
    console.error("[ai/cover-letter]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI: ATS Score
// ---------------------------------------------------------------------------
app.post("/api/ai/ats-score", async (req, res) => {
  try {
    const { resumeText, jobDescription, apiKey } = req.body;
    const client = getOpenAIClient(apiKey);
    if (!client) {
      return res.status(400).json({ ok: false, error: "No API key configured." });
    }
    const systemPrompt = `You are an ATS (Applicant Tracking System) expert. Analyze the resume against the job description and provide:
1. An overall match score (0-100)
2. Keyword matches found
3. Missing keywords
4. Section-by-section feedback (summary, experience, skills, education)
5. Specific improvement suggestions

Output as JSON with this structure:
{
  "score": number,
  "summary": "brief overall assessment",
  "keywordMatches": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "sections": {
    "summary": { "score": number, "feedback": "..." },
    "experience": { "score": number, "feedback": "..." },
    "skills": { "score": number, "feedback": "..." },
    "education": { "score": number, "feedback": "..." }
  },
  "suggestions": ["suggestion1", "suggestion2"]
}`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}` },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content || "{}";
    res.json({ ok: true, data: JSON.parse(content), usage: completion.usage });
  } catch (err: any) {
    console.error("[ai/ats-score]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI: Interview Prep
// ---------------------------------------------------------------------------
app.post("/api/ai/interview-prep", async (req, res) => {
  try {
    const { jobTitle, company, jobDescription, apiKey } = req.body;
    const client = getOpenAIClient(apiKey);
    if (!client) {
      return res.status(400).json({ ok: false, error: "No API key configured." });
    }
    const systemPrompt = `You are an interview preparation coach. Generate comprehensive interview preparation material for the given role.

Output as JSON:
{
  "overview": "Brief role assessment and what to expect",
  "rounds": [
    {
      "name": "Round name",
      "description": "What this round covers",
      "duration": "estimated time",
      "questions": [
        { "question": "...", "tip": "how to answer", "sampleAnswer": "..." }
      ]
    }
  ],
  "behavioralQuestions": [
    { "question": "...", "framework": "STAR method tip", "sampleAnswer": "..." }
  ],
  "technicalTopics": ["topic1", "topic2"],
  "tips": ["tip1", "tip2"]
}`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `JOB TITLE: ${jobTitle}\nCOMPANY: ${company || "Not specified"}\n\nJOB DESCRIPTION:\n${jobDescription}` },
      ],
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content || "{}";
    res.json({ ok: true, data: JSON.parse(content), usage: completion.usage });
  } catch (err: any) {
    console.error("[ai/interview-prep]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI: Mock Interview
// ---------------------------------------------------------------------------
app.post("/api/ai/mock-interview", async (req, res) => {
  try {
    const { jobTitle, jobDescription, resumeText, messages: chatHistory, apiKey } = req.body;
    const client = getOpenAIClient(apiKey);
    if (!client) {
      return res.status(400).json({ ok: false, error: "No API key configured." });
    }
    const systemPrompt = `You are conducting a mock interview for the position of ${jobTitle}. 
You are the interviewer. Ask one question at a time. After the candidate answers, provide brief feedback and then ask the next question.
Mix behavioral (STAR method) and technical questions relevant to the job description.
Be encouraging but honest. If the candidate's answer is weak, suggest improvements.
Start by introducing yourself and asking the first question.
Keep responses concise (2-3 paragraphs max).`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Context — Resume: ${resumeText}\nJob Description: ${jobDescription}` },
      ...(chatHistory || []),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    res.json({ ok: true, data: { content: completion.choices[0]?.message?.content || "" }, usage: completion.usage });
  } catch (err: any) {
    console.error("[ai/mock-interview]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve frontend in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(process.cwd(), "public");
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[jobaton-oss] API running on http://0.0.0.0:${PORT}`);
});
