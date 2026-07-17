#!/usr/bin/env node
/**
 * Takes an already-generated draft (i.e. after scripts/new-post.js has run
 * and the working tree has the new/changed blog files) and:
 *   1. Creates a new branch
 *   2. Commits the draft
 *   3. Pushes the branch to origin
 *   4. Sends an email notification (via scripts/notify.js) with the
 *      Netlify branch-deploy preview URL
 *   5. Switches back to main
 *
 * Requires Netlify "Branch deploys" set to "All" in site settings, so a
 * push to any branch gets an automatic preview URL — see AGENTS.md.
 *
 * Usage:
 *   node scripts/publish-draft.js --slug my-post-slug --title "Post Title"
 */

const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const NETLIFY_SITE = "mustcode"; // mustcode.netlify.app

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

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, stdio: "pipe" }).toString().trim();
}

const args = parseArgs(process.argv.slice(2));
if (!args.slug || !args.title) {
  console.error('Usage: node scripts/publish-draft.js --slug <slug> --title "<title>"');
  process.exit(1);
}

const branch = `blog-draft-${args.slug}`;

console.log(`Creating branch ${branch}...`);
git(["checkout", "-b", branch]);

console.log("Staging draft files...");
git([
  "add",
  `blog/${args.slug}.html`,
  `blog/images/${args.slug}.jpg`,
  "blog/posts.json",
  "blog/index.html",
  "index.html",
  "sitemap.xml",
]);

console.log("Committing...");
git(["commit", "-m", `Add blog draft: ${args.title}`]);

console.log(`Pushing ${branch} to origin...`);
git(["push", "-u", "origin", branch]);

console.log("Switching back to main...");
git(["checkout", "main"]);

const previewUrl = `https://${branch}--${NETLIFY_SITE}.netlify.app/blog/${args.slug}.html`;

console.log("Sending notification...");
execFileSync(
  "node",
  [
    path.join(ROOT, "scripts", "notify.js"),
    "--subject", `Blog draft: ${args.title}`,
    "--message", `New blog post drafted and ready to look over.\n\nTitle: ${args.title}\n\nRead it here: ${previewUrl}\n\nBranch name (for reference): ${branch}\n\nOpen the Claude session and let me know if it's good to publish or needs changes.`,
  ],
  { stdio: "inherit" }
);

console.log(`\nDone. Draft pushed to branch "${branch}" and notification sent.`);
