function setCorsHeaders(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}


function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateProgressEvent(body) {
  const errors = [];

  if (!isObject(body)) {
    return ["Body must be a JSON object"];
  }

  if (typeof body.studentId !== "string" || !body.studentId.trim()) {
    errors.push("studentId is required and must be a non-empty string");
  }

  if (typeof body.activityId !== "string" || !body.activityId.trim()) {
    errors.push("activityId is required and must be a non-empty string");
  }

  if (typeof body.sessionId !== "string" || !body.sessionId.trim()) {
    errors.push("sessionId is required and must be a non-empty string");
  }

  if (!EVENT_TYPES.includes(body.eventType)) {
    errors.push(`eventType must be one of: ${EVENT_TYPES.join(", ")}`);
  }

  if (!isIsoDate(body.timestamp)) {
    errors.push("timestamp must be an ISO 8601 datetime string");
  }

  if (!isObject(body.payload)) {
    errors.push("payload is required and must be an object");
  } else {
    if (
      "cefrEstimate" in body.payload &&
      !["A1", "A2", "B1", "B2", "C1", "C2"].includes(body.payload.cefrEstimate)
    ) {
      errors.push("payload.cefrEstimate must be one of A1, A2, B1, B2, C1, C2");
    }

    if (
      "responseLatencyMs" in body.payload &&
      (typeof body.payload.responseLatencyMs !== "number" ||
        body.payload.responseLatencyMs < 0)
    ) {
      errors.push("payload.responseLatencyMs must be a positive number");
    }
  }

  return errors;
}

async function forwardToOpenLearning(event) {
  const webhookUrl = process.env.OPENLEARNING_WEBHOOK_URL;
  if (!webhookUrl) {
    return { forwarded: false, reason: "OPENLEARNING_WEBHOOK_URL not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const result = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OPENLEARNING_API_KEY
          ? { Authorization: `Bearer ${process.env.OPENLEARNING_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    return {
      forwarded: result.ok,
      statusCode: result.status,
      reason: result.ok ? "ok" : `upstream status ${result.status}`,
    };
  } catch (error) {
    return {
      forwarded: false,
      reason: error?.message || "Failed to call OpenLearning webhook",
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);


  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  const errors = validateProgressEvent(req.body);
  if (errors.length) {
    return res.status(400).json({
      error: "Invalid progress event",
      validationErrors: errors,
    });
  }

  const receivedAt = new Date().toISOString();
  const upstream = await forwardToOpenLearning(req.body);

  return res.status(200).json({
    status: upstream.forwarded ? "forwarded" : "accepted_mock",
    receivedAt,
    event: {
      studentId: req.body.studentId,
      activityId: req.body.activityId,
      sessionId: req.body.sessionId,
      eventType: req.body.eventType,
    },
    upstream,
  });
};
