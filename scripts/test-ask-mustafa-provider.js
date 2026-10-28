const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/ask-mustafa");
const { resolveProviderOrder } = require("../netlify/functions/ask-mustafa-providers");

const originalFetch = global.fetch;
const originalEnvironment = {
  AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL
};

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; }
  };
}

function event(body, ip) {
  return {
    httpMethod: "POST",
    headers: {
      host: "aisaaswithmustafa.com",
      origin: "https://aisaaswithmustafa.com",
      "x-nf-client-connection-ip": ip
    },
    body: JSON.stringify(body)
  };
}

async function run() {
  assert.deepEqual(resolveProviderOrder({}), ["gemini", "groq"]);
  assert.deepEqual(resolveProviderOrder({ AI_PRIMARY_PROVIDER: "groq" }), ["groq", "gemini"]);

  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GROQ_API_KEY = "test-groq-key";
  delete process.env.AI_PRIMARY_PROVIDER;

  const geminiCalls = [];
  global.fetch = async function (url, options) {
    geminiCalls.push({ url, options, body: JSON.parse(options.body) });
    return response(200, {
      candidates: [{ content: { parts: [{ text: "Verified Gemini answer." }] } }]
    });
  };

  const geminiResult = await handler(event({ question: "Tell me about CultureAI." }, "198.51.100.1"));
  const geminiBody = JSON.parse(geminiResult.body);
  assert.equal(geminiResult.statusCode, 200);
  assert.equal(geminiBody.provider, "gemini");
  assert.equal(geminiBody.answer, "Verified Gemini answer.");
  assert.equal(geminiCalls.length, 1);
  assert.match(geminiCalls[0].url, /generativelanguage\.googleapis\.com/);
  assert.equal(geminiCalls[0].options.headers["x-goog-api-key"], "test-gemini-key");

  const fallbackCalls = [];
  global.fetch = async function (url, options) {
    fallbackCalls.push({ url, options, body: JSON.parse(options.body) });
    if (url.includes("generativelanguage.googleapis.com")) {
      return response(429, { error: { message: "Quota reached" } });
    }
    return response(200, {
      choices: [{ message: { content: "Groq fallback answer." } }]
    });
  };

  const fallbackResult = await handler(event({ question: "What is your core stack?" }, "198.51.100.2"));
  const fallbackBody = JSON.parse(fallbackResult.body);
  assert.equal(fallbackResult.statusCode, 200);
  assert.equal(fallbackBody.provider, "groq");
  assert.equal(fallbackBody.answer, "Groq fallback answer.");
  assert.equal(fallbackCalls.length, 2);
  assert.match(fallbackCalls[1].url, /api\.groq\.com/);

  const scopeCalls = [];
  global.fetch = async function (url, options) {
    scopeCalls.push({ url, body: JSON.parse(options.body) });
    return response(200, {
      candidates: [{ content: { parts: [{ text: "WHAT YOU ARE BUILDING\nA focused SaaS MVP." }] } }]
    });
  };

  const scopeResult = await handler(event({
    mode: "scope",
    question: "I want a multi-tenant booking SaaS for small clinics with staff roles and subscriptions."
  }, "198.51.100.3"));
  const scopeBody = JSON.parse(scopeResult.body);
  assert.equal(scopeResult.statusCode, 200);
  assert.equal(scopeBody.mode, "scope");
  assert.equal(scopeBody.provider, "gemini");
  assert.match(scopeCalls[0].body.systemInstruction.parts[0].text, /MVP NOW/);
  assert.match(scopeCalls[0].body.systemInstruction.parts[0].text, /POSTPONE/);
  assert.match(scopeCalls[0].body.systemInstruction.parts[0].text, /COMPLEXITY/);

  delete process.env.GEMINI_API_KEY;
  let groqOnlyUrl = "";
  global.fetch = async function (url) {
    groqOnlyUrl = url;
    return response(200, { choices: [{ message: { content: "Groq only answer." } }] });
  };

  const groqOnlyResult = await handler(event({ question: "Are you available?" }, "198.51.100.4"));
  assert.equal(JSON.parse(groqOnlyResult.body).provider, "groq");
  assert.match(groqOnlyUrl, /api\.groq\.com/);

  console.log("Ask Mustafa Gemini primary, Groq fallback and Scope Doctor tests passed.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
    Object.entries(originalEnvironment).forEach(([key, value]) => {
      if (typeof value === "undefined") delete process.env[key];
      else process.env[key] = value;
    });
  });
