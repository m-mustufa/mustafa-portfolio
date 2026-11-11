const { runLinkedIn } = require("./linkedin");

// Runs after a production deploy is live. Shares at most one new blog post or
// free tool on LinkedIn as an image post (the page's OG image plus the
// hand-written text from social/linkedin.json). Off unless
// LINKEDIN_AUTO_POST=true; a failure is shown in the deploy summary and never
// affects the deploy.
module.exports = {
  async onSuccess({ utils }) {
    try {
      const result = await runLinkedIn();
      const lines = [];
      let summary;

      if (result.skipped) {
        summary = `Skipped: ${result.skipped}.`;
      } else if (result.dryRun) {
        const item = result.items[0];
        summary = `Dry run: would share ${item.url} with image ${item.imagePath}.`;
        lines.push("Post text:", item.commentary);
      } else {
        summary = `Shared ${result.posted.map((p) => p.url).join(", ")} on LinkedIn.`;
        for (const post of result.posted) if (post.postId) lines.push(`Post id: ${post.postId}`);
      }
      if (result.notReady?.length) lines.push("Not shared, LinkedIn text incomplete:", ...result.notReady);
      if (result.extra?.length) lines.push(`Not shared (one post per deploy): ${result.extra.join(", ")}`);
      if (result.scheduled?.length) lines.push("Scheduled (shared later by the linkedin-scheduled function):", ...result.scheduled);
      if (result.tokenStatus) summary = `${summary} ${result.tokenStatus[0].toUpperCase()}${result.tokenStatus.slice(1)}.`;
      if (result.warning) summary = `${summary} ${result.warning}`;

      console.log(`LinkedIn: ${summary}`);
      for (const line of lines) console.log(line);
      utils.status.show({ title: "LinkedIn", summary, text: lines.join("\n") || undefined });
    } catch (error) {
      const reason = String(error.message || error).split(/\r?\n/)[0];
      const summary = `Not shared: ${reason}.`;
      console.log(`LinkedIn: ${summary}`);
      utils.status.show({ title: "LinkedIn", summary });
    }
  },
};
