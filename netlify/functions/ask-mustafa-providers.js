const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_TIMEOUT_MS = 9000;

class ProviderError extends Error {
  constructor(provider, code, message, status) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.code = code;
    this.status = status || 502;
  }
}

function providerTimeout(env) {
  const configured = Number(env.AI_PROVIDER_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
  return Math.min(15000, Math.max(3000, configured));
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProviderError(provider, error) {
  if (error instanceof ProviderError) return error;
  if (error && error.name === "AbortError") {
    return new ProviderError(provider, `${provider.toUpperCase()}_TIMEOUT`, `${provider} timed out.`);
  }
  return new ProviderError(provider, `${provider.toUpperCase()}_NETWORK`, `${provider} could not be reached.`);
}

async function callGemini({ systemPrompt, question, history, env, fetchImpl }) {
  const provider = "gemini";
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const contents = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
  contents.push({ role: "user", parts: [{ text: question }] });

  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 900
          }
        })
      },
      providerTimeout(env)
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamMessage = data.error && data.error.message ? data.error.message : "Unknown Gemini error";
      throw new ProviderError(provider, `GEMINI_UPSTREAM_${response.status}`, upstreamMessage);
    }

    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const answer = Array.isArray(parts)
      ? parts.map((part) => (typeof part.text === "string" ? part.text : "")).join("\n").trim()
      : "";

    if (!answer) {
      throw new ProviderError(provider, "GEMINI_EMPTY", "Gemini returned an empty answer.");
    }

    return answer;
  } catch (error) {
    throw normalizeProviderError(provider, error);
  }
}

async function callGroq({ systemPrompt, question, history, env, fetchImpl }) {
  const provider = "groq";

  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      GROQ_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: question }
          ],
          reasoning_effort: "low",
          temperature: 0,
          max_completion_tokens: 900
        })
      },
      providerTimeout(env)
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamMessage = data.error && data.error.message ? data.error.message : "Unknown Groq error";
      throw new ProviderError(provider, `GROQ_UPSTREAM_${response.status}`, upstreamMessage);
    }

    const answer = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!answer || typeof answer !== "string") {
      throw new ProviderError(provider, "GROQ_EMPTY", "Groq returned an empty answer.");
    }

    return answer.trim();
  } catch (error) {
    throw normalizeProviderError(provider, error);
  }
}

function resolveProviderOrder(env) {
  const preferred = String(env.AI_PRIMARY_PROVIDER || "gemini").toLowerCase();
  return preferred === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
}

async function generateAnswer({ systemPrompt, question, history, env = process.env, fetchImpl = fetch, onProviderError = null }) {
  const configuredProviders = resolveProviderOrder(env).filter((provider) => (
    provider === "gemini" ? Boolean(env.GEMINI_API_KEY) : Boolean(env.GROQ_API_KEY)
  ));

  if (!configuredProviders.length) {
    throw new ProviderError("none", "PROVIDER_NOT_CONFIGURED", "No AI provider is configured.", 503);
  }

  let lastError;
  for (const provider of configuredProviders) {
    try {
      const answer = provider === "gemini"
        ? await callGemini({ systemPrompt, question, history, env, fetchImpl })
        : await callGroq({ systemPrompt, question, history, env, fetchImpl });
      return { answer, provider };
    } catch (error) {
      lastError = normalizeProviderError(provider, error);
      if (typeof onProviderError === "function") onProviderError(lastError);
    }
  }

  throw lastError || new ProviderError("none", "PROVIDER_FAILED", "No provider returned an answer.");
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  ProviderError,
  callGemini,
  callGroq,
  generateAnswer,
  resolveProviderOrder
};
