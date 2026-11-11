// Tests for scripts/gsc.js with a throwaway RSA key and a mocked Google API.
// Nothing is sent to Google.
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildJwt, compareRows, inspectionLine, main, parseArgs, pickSite, queryBody, ranges } = require("./gsc");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const account = { clientEmail: "gsc-reader@test.iam.gserviceaccount.com", privateKey: pem };

// The JWT is signed with the key and asks only for the read-only scope.
const jwt = buildJwt(account, 1_700_000_000);
const [h, c, s] = jwt.split(".");
const claims = JSON.parse(Buffer.from(c, "base64url"));
assert.deepStrictEqual(JSON.parse(Buffer.from(h, "base64url")), { alg: "RS256", typ: "JWT" });
assert.strictEqual(claims.scope, "https://www.googleapis.com/auth/webmasters.readonly");
assert.strictEqual(claims.aud, "https://oauth2.googleapis.com/token");
assert.strictEqual(claims.exp - claims.iat, 3600);
assert.ok(crypto.createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s, "base64url")));

assert.deepStrictEqual(parseArgs(["pages", "--start", "2026-11-04", "--fresh", "--end=2026-11-17"]), {
  _: ["pages"],
  start: "2026-11-04",
  fresh: true,
  end: "2026-11-17",
});
const r = ranges({ start: "2026-11-04", end: "2026-11-17", "vs-start": "2026-10-21", "vs-end": "2026-11-03" });
assert.strictEqual(r.current.days, 14);
assert.strictEqual(r.previous.days, 14);
assert.deepStrictEqual(ranges({}, "2026-11-30").current, { start: "2026-10-31", end: "2026-11-27", days: 28 });
assert.throws(() => ranges({ start: "2026-11-10", end: "2026-11-01" }), /Invalid date range/);

assert.strictEqual(pickSite([{ siteUrl: "https://aisaaswithmustafa.com/", permissionLevel: "siteRestrictedUser" }, { siteUrl: "sc-domain:aisaaswithmustafa.com", permissionLevel: "siteRestrictedUser" }]), "sc-domain:aisaaswithmustafa.com");
assert.throws(() => pickSite([]), /No access/);
assert.deepStrictEqual(queryBody(r.current, ["page"], { page: "https://aisaaswithmustafa.com/" }).dimensionFilterGroups[0].filters[0], {
  dimension: "page",
  operator: "equals",
  expression: "https://aisaaswithmustafa.com/",
});
assert.strictEqual(queryBody(r.current, [], { fresh: true }).dataState, "all");

const merged = compareRows(
  [{ keys: ["/a"], clicks: 1, impressions: 16, position: 5 }],
  [{ keys: ["/a"], clicks: 0, impressions: 14, position: 7 }, { keys: ["/b"], clicks: 0, impressions: 28, position: 9 }],
  { days: 8 },
  { days: 14 },
);
assert.deepStrictEqual(merged.map((m) => [m.key, m.nowPerDay, m.beforePerDay]), [["/a", 2, 1], ["/b", 0, 2]]);

assert.strictEqual(
  inspectionLine("https://aisaaswithmustafa.com/blog/x.html", {
    inspectionResult: {
      indexStatusResult: {
        verdict: "NEUTRAL",
        coverageState: "Discovered - currently not indexed",
        googleCanonical: "https://aisaaswithmustafa.com/blog/y.html",
        userCanonical: "https://aisaaswithmustafa.com/blog/x.html",
      },
    },
  }),
  "/blog/x.html | NEUTRAL | Discovered - currently not indexed | last crawl never | Google canonical /blog/y.html",
);

// End to end with a mocked API: token exchange, property choice, query body.
(async () => {
  const keyFile = path.join(os.tmpdir(), `gsc-test-${process.pid}.json`);
  fs.writeFileSync(keyFile, JSON.stringify({ type: "service_account", client_email: account.clientEmail, private_key: pem }));
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    const json = (status, data) => ({ ok: status < 300, status, text: async () => JSON.stringify(data) });
    if (url === "https://oauth2.googleapis.com/token") return json(200, { access_token: "secret-access-token" });
    if (url.endsWith("/webmasters/v3/sites")) return json(200, { siteEntry: [{ siteUrl: "sc-domain:aisaaswithmustafa.com", permissionLevel: "siteRestrictedUser" }] });
    if (url.includes("/searchAnalytics/query")) {
      const body = JSON.parse(options.body);
      return json(200, { rows: [{ keys: ["https://aisaaswithmustafa.com/blog/a.html"], clicks: 1, impressions: body.startDate === "2026-11-04" ? 28 : 14, ctr: 0.05, position: 6 }] });
    }
    return json(403, { error: "denied secret-access-token" });
  };
  const out = [];
  await main(["pages", "--start", "2026-11-04", "--end", "2026-11-17", "--vs-start", "2026-10-21", "--vs-end", "2026-11-03"], {
    fetchImpl,
    env: { GSC_KEY_FILE: keyFile },
    log: (line) => out.push(line),
  });
  const tokenCall = calls[0];
  assert.ok(String(tokenCall.options.body).includes("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer"));
  const queryCall = calls.find((c) => c.url.includes("/searchAnalytics/query"));
  assert.ok(queryCall.url.includes("/sites/sc-domain%3Aaisaaswithmustafa.com/searchAnalytics/query"), "the site is URL-encoded");
  assert.strictEqual(queryCall.options.headers.Authorization, "Bearer secret-access-token");
  assert.strictEqual(calls.filter((c) => c.url === "https://oauth2.googleapis.com/token").length, 1, "one token per run");
  const text = out.join("\n");
  assert.ok(text.includes("/blog/a.html | 1/1 | 28/14 (2.0/1.0) | 6.0/6.0"));
  assert.ok(!text.includes("secret-access-token") && !text.includes("PRIVATE KEY"), "never prints the token or key");

  // A permission error explains what to fix and hides the token.
  let denied;
  try {
    await main(["sitemaps"], { fetchImpl, env: { GSC_KEY_FILE: keyFile }, log: () => {} });
  } catch (error) {
    denied = error;
  }
  assert.ok(denied.message.includes("Restricted user"));
  assert.ok(!denied.message.includes("secret-access-token"));

  await assert.rejects(main(["sites"], { fetchImpl, env: { GSC_KEY_FILE: path.join(os.tmpdir(), "missing.json") }, log: () => {} }), /not found/);
  fs.unlinkSync(keyFile);
  console.log("GSC helper tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
