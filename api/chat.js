const crypto = require("crypto");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.openlearning.com",
  "https://openlearning.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function getAllowedOrigins() {
  const configured = (process.env.OPENLEARNING_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...DEFAULT_ALLOWED_ORIGINS])];
}

function getCorsOrigin(req) {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return null;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
}

function setCorsHeaders(req, res) {
  const allowOrigin = getCorsOrigin(req);
  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function isOriginAllowed(req) {
  if (!req.headers.origin) return true;
  return Boolean(getCorsOrigin(req));
}

function isComplexWord(word) {
  return word.length >= 8;
}

function normalizeStudentInput(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.message === "string") return body.message.trim();
  if (typeof body.text === "string") return body.text.trim();
  return "";
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const studentInput = normalizeStudentInput(req.body);
  const sessionId = req.body?.sessionId || `sess_${crypto.randomUUID()}`;

  if (!studentInput) {
    return res.status(400).json({
      error: "Missing input text. Provide req.body.message or req.body.text",
    });
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.3-codex",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are PLC Tutor Bot for ESL learners. Return concise, supportive, structured JSON only. Keep examples short for a narrow (500px) UI.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Student text: ${studentInput}\n\nTasks:\n1) Correct grammar and punctuation.\n2) Explain key mistakes simply (max 3 points).\n3) Provide pronunciation help for up to 4 complex words using sounds-like spelling.\n4) Give one short follow-up practice question.\n\nReturn strict JSON with keys: correctedText, grammarNotes, pronunciationGuide, followUpQuestion, cefrEstimate.\n- grammarNotes: array of {issue, explanation}.\n- pronunciationGuide: array of {word, soundsLike}.\n- Keep each explanation under 140 chars.`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "plc_tutor_response",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              correctedText: { type: "string" },
              grammarNotes: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    issue: { type: "string" },
                    explanation: { type: "string" },
                  },
                  required: ["issue", "explanation"],
                },
              },
              pronunciationGuide: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    word: { type: "string" },
                    soundsLike: { type: "string" },
                  },
                  required: ["word", "soundsLike"],
                },
              },
              followUpQuestion: { type: "string" },
              cefrEstimate: {
                type: "string",
                enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
              },
            },
            required: [
              "correctedText",
              "grammarNotes",
              "pronunciationGuide",
              "followUpQuestion",
              "cefrEstimate",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    const emphasizedWords = studentInput
      .split(/\s+/)
      .map((raw) => raw.replace(/[^a-zA-Z']/g, ""))
      .filter((word) => word && isComplexWord(word));

    return res.status(200).json({
      sessionId,
      studentText: studentInput,
      tutor: parsed,
      telemetry: {
        ts: new Date().toISOString(),
        responseId: response.id,
        complexWordCandidates: emphasizedWords.slice(0, 8),
      },
      tracking: {
        provider: "openlearning",
        contractVersion: "1.0.0",
        status: "ready_for_webhook",
        endpoint: "/api/progress",
      },
    });
  } catch (error) {
    console.error("/api/chat error", error);
    return res.status(500).json({
      error: "Failed to generate tutor response",
      details: error?.message || "Unknown error",
    });
  }
};
