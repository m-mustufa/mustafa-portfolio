// Shares LinkedIn posts that have a "publishAt" time in social/linkedin.json.
// Runs every 15 minutes on the published production deploy only (Netlify does
// not run scheduled functions on previews or branch deploys). At most one post
// per run; a Netlify Blobs store remembers what was shared so nothing is
// posted twice. Same switches as the deploy plugin: LINKEDIN_AUTO_POST,
// LINKEDIN_DRY_RUN and LINKEDIN_ACCESS_TOKEN. Results are in the function log.
import { getStore } from "@netlify/blobs";
import linkedin from "../plugins/linkedin/linkedin.js";

const { SCHEDULE_STORE, describeScheduled, runScheduledLinkedIn } = linkedin;

export default async () => {
  try {
    const store = getStore({ name: SCHEDULE_STORE, consistency: "strong" });
    const { summary, lines } = describeScheduled(await runScheduledLinkedIn({ store }));
    console.log(`LinkedIn schedule: ${summary}`);
    for (const line of lines) console.log(line);
  } catch (error) {
    const reason = String((error && error.message) || error).split(/\r?\n/)[0];
    console.log(`LinkedIn schedule: Not shared: ${reason}.`);
  }
  return new Response("ok");
};

export const config = {
  schedule: "*/15 * * * *",
};
