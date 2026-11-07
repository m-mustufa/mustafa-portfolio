(function () {
  "use strict";

  var ENDPOINT = "/.netlify/functions/indexnow-submit";
  var STORAGE_KEY = "indexnow-submitter:v1";
  var MAX_URLS = 100;
  var KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

  var form = document.querySelector("[data-indexnow-form]");
  if (!form) return;

  var hostInput = form.elements.host;
  var keyInput = form.elements.key;
  var urlsInput = form.elements.urls;
  var keyLocationEl = form.querySelector("[data-indexnow-key-location]");
  var urlCountEl = form.querySelector("[data-indexnow-url-count]");
  var downloadButton = form.querySelector("[data-indexnow-download]");
  var verifyButton = form.querySelector("[data-indexnow-verify]");
  var submitButton = form.querySelector("[data-indexnow-submit]");
  var results = document.querySelector("[data-indexnow-results]");
  var logEl = document.querySelector("[data-indexnow-log]");
  var busy = false;

  function readStore() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function writeStore(value) {
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      /* Storage can be unavailable in private windows; the tool still works. */
    }
  }

  function cleanHost(value) {
    var host = String(value || "").trim().toLowerCase();
    host = host.replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
    return host;
  }

  function cleanKey() {
    return String(keyInput.value || "").trim();
  }

  function urlLines() {
    return String(urlsInput.value || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function generateKey() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function setResult(name, value, tone) {
    var el = results.querySelector('[data-indexnow-result="' + name + '"]');
    if (!el) return;
    el.textContent = value;
    el.className = tone ? "indexnow-tone-" + tone : "";
  }

  function log(lines, tone) {
    logEl.innerHTML = "";
    lines.forEach(function (line) {
      var item = document.createElement("li");
      item.textContent = line;
      if (tone) item.className = "indexnow-log-" + tone;
      logEl.appendChild(item);
    });
  }

  function refresh() {
    var host = cleanHost(hostInput.value);
    var key = cleanKey();
    var validKey = KEY_PATTERN.test(key);
    keyLocationEl.textContent = "https://" + (host || "example.com") + "/" + (validKey ? key : "your-key") + ".txt";
    downloadButton.disabled = !validKey;

    var count = urlLines().length;
    urlCountEl.textContent = count
      ? count + " URL" + (count === 1 ? "" : "s") + " entered" + (count > MAX_URLS ? ". Remove " + (count - MAX_URLS) + " to stay within 100." : ".")
      : "Up to 100 full URLs, all on the domain above.";
    urlCountEl.classList.toggle("indexnow-over-limit", count > MAX_URLS);

    if (host || key) writeStore({ host: host, key: key });
  }

  function validateBase() {
    var host = cleanHost(hostInput.value);
    var key = cleanKey();
    if (!host || host.indexOf(".") === -1) return "Enter your website domain, for example example.com.";
    if (!KEY_PATTERN.test(key)) return "Generate a key or paste one with 8 to 128 letters, numbers or dashes.";
    return "";
  }

  function setBusy(state, label) {
    busy = state;
    verifyButton.disabled = state;
    submitButton.disabled = state;
    submitButton.textContent = state && label ? label : "Submit to IndexNow";
    results.setAttribute("aria-busy", state ? "true" : "false");
  }

  // Counts real tool use in Google Analytics. style.js only sends it after the
  // visitor accepts analytics. Only trusted (real user) clicks count, so a
  // script or bot is ignored. Never include the visitor's domain, key or URLs.
  function trackToolUse(trusted, action, result) {
    if (!trusted) return;
    var analytics = window.siteAnalytics;
    if (!analytics || typeof analytics.track !== "function") return;
    analytics.track("tool_used", { tool_name: "indexnow_submitter", tool_action: action, tool_result: result });
  }

  async function send(action, trusted) {
    if (busy) return;
    var problem = validateBase();
    var urls = action === "submit" ? urlLines() : [];
    if (!problem && action === "submit") {
      if (!urls.length) problem = "Add at least one URL to submit, one per line.";
      else if (urls.length > MAX_URLS) problem = "Submit up to 100 URLs at a time.";
    }
    if (problem) {
      log([problem], "warn");
      return;
    }

    setBusy(true, action === "submit" ? "Submitting..." : "");
    setResult("key", "Checking...");
    if (action === "submit") {
      setResult("status", "—");
      setResult("count", "—");
    }
    log([action === "submit" ? "Checking your key file, then sending your URLs to IndexNow." : "Checking your key file."]);

    try {
      var response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, host: cleanHost(hostInput.value), key: cleanKey(), urls: urls }),
      });
      var data = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        setResult("key", "—");
        log([data.error || "The request could not be completed. Please try again."], "warn");
        trackToolUse(trusted, action, "request_error");
        return;
      }

      var verification = data.verification || {};
      setResult("key", verification.ok ? "Found" : "Not found", verification.ok ? "good" : "bad");
      var lines = [verification.message + " (" + verification.keyLocation + ")"];

      if (!verification.ok || !data.submission) trackToolUse(trusted, action, verification.ok ? "key_found" : "key_not_found");

      if (action === "submit" && !verification.ok) {
        lines.push("Nothing was sent. Fix the key file first, then submit again.");
        log(lines, "warn");
        return;
      }

      if (data.submission) {
        var submission = data.submission;
        trackToolUse(trusted, action, "http_" + submission.httpStatus);
        setResult("status", String(submission.httpStatus), submission.ok ? "good" : "bad");
        setResult("count", String(submission.submitted), submission.ok ? "good" : "");
        lines.push(submission.message);
        if (submission.ok) lines.push("This speeds up discovery. Indexing and ranking still depend on each search engine.");
        log(lines, submission.ok ? "good" : "warn");
        return;
      }

      if (verification.ok) lines.push("You are ready to submit URLs.");
      log(lines, verification.ok ? "good" : "warn");
    } catch (_error) {
      setResult("key", "—");
      log(["Could not reach the submitter. Check your connection and try again."], "warn");
    } finally {
      setBusy(false);
    }
  }

  var saved = readStore();
  if (saved.host) hostInput.value = saved.host;
  if (saved.key) keyInput.value = saved.key;

  form.querySelector("[data-indexnow-generate]").addEventListener("click", function () {
    keyInput.value = generateKey();
    refresh();
    log(["New key created. Download the key file and upload it to your site root, then check it."]);
  });

  downloadButton.addEventListener("click", function () {
    var key = cleanKey();
    if (!KEY_PATTERN.test(key)) return;
    var blob = new Blob([key], { type: "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = key + ".txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  });

  verifyButton.addEventListener("click", function (event) { send("verify", event.isTrusted); });

  form.querySelector("[data-indexnow-reset]").addEventListener("click", function () {
    form.reset();
    writeStore(null);
    setResult("key", "—");
    setResult("status", "—");
    setResult("count", "—");
    log(["Cleared. Enter your domain and key to start again."]);
    refresh();
  });

  hostInput.addEventListener("blur", function () {
    var host = cleanHost(hostInput.value);
    if (host !== hostInput.value) hostInput.value = host;
    refresh();
  });
  form.addEventListener("input", refresh);
  // Browsers mark every submit event as trusted, even one started by a script,
  // so remember whether a person actually clicked the submit button.
  var submitClickedByUser = false;
  submitButton.addEventListener("click", function (event) { submitClickedByUser = event.isTrusted; });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var byUser = submitClickedByUser;
    submitClickedByUser = false;
    send("submit", byUser);
  });

  refresh();
})();
