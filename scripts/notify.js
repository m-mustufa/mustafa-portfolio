#!/usr/bin/env node
/**
 * Sends a notification email via the dedicated "blog-automation" Formspree
 * form (separate from the site's real contact form, so blog notifications
 * never mix with actual customer leads).
 *
 * Usage:
 *   node scripts/notify.js --subject "..." --message "..."
 */

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykrklbg";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.subject || !args.message) {
  console.error('Usage: node scripts/notify.js --subject "..." --message "..."');
  process.exit(1);
}

(async () => {
  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ subject: args.subject, message: args.message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    console.error(`Notification failed (${res.status}):`, data);
    process.exit(1);
  }
  console.log("Notification sent.");
})();
