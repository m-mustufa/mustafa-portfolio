const { runIndexNow } = require("./changed-urls");

// Runs after a deploy is live. It submits only the sitemap pages whose HTML
// changed since the last production build. A failure is logged and never
// affects the deploy; `npm run indexnow:submit` remains the manual fallback.
module.exports = {
  async onSuccess({ utils }) {
    try {
      const result = await runIndexNow();

      if (result.skipped) {
        console.log(`IndexNow: skipped, ${result.skipped}.`);
        utils.status.show({ title: "IndexNow", summary: `Skipped: ${result.skipped}.` });
        return;
      }

      const summary = result.dryRun
        ? `Dry run: ${result.urls.length} changed URL(s) would be submitted.`
        : `Submitted ${result.urls.length} changed URL(s), HTTP ${result.status}.`;
      console.log(`IndexNow: ${summary}`);
      for (const url of result.urls) console.log(`- ${url}`);
      utils.status.show({ title: "IndexNow", summary, text: result.urls.join("\n") });
    } catch (error) {
      const reason = String(error.message || error).split(/\r?\n/)[0];
      const summary = `Not submitted: ${reason}. Run npm run indexnow:submit manually.`;
      console.log(`IndexNow: ${summary}`);
      utils.status.show({ title: "IndexNow", summary });
    }
  },
};
