const { runLinkedIn } = require("./linkedin");

// Runs after a production deploy is live. Shares at most one new blog post or
// free tool on LinkedIn. Off unless LINKEDIN_AUTO_POST=true; a failure is shown
// in the deploy summary and never affects the deploy.
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
        summary = `Dry run: would share ${item.url}.`;
        lines.push("Post text:", item.commentary);
      } else {
        summary = `Shared ${result.posted.map((p) => p.url).join(", ")} on LinkedIn.`;
        for (const post of result.posted) if (post.postId) lines.push(`Post id: ${post.postId}`);
        lines.push(...(result.notes || []));
      }
      if (result.extra?.length) lines.push(`Not shared (one post per deploy): ${result.extra.join(", ")}`);
      if (result.warning) {
        summary = `${summary} ${result.warning}`;
      }

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
