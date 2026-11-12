// Cross-posts blog posts listed in social/devto.json to DEV Community at their
// publishAt time, with a canonical link back to the original. Runs every 15
// minutes on the published production deploy only. See netlify/lib/devto.js.
import { getStore } from "@netlify/blobs";
// Imported here (not only in lib/devto.js) so Netlify's bundler ships them.
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import devto from "../lib/devto.js";

const { DEVTO_STORE, describe, runDevto } = devto;

export default async () => {
  try {
    const store = getStore({ name: DEVTO_STORE, consistency: "strong" });
    const { summary, lines } = describe(await runDevto({ store, markdown: { TurndownService, gfm } }));
    console.log(`DEV schedule: ${summary}`);
    for (const line of lines) console.log(line);
  } catch (error) {
    const reason = String((error && error.message) || error).split(/\r?\n/)[0];
    console.log(`DEV schedule: Not published: ${reason}.`);
  }
  return new Response("ok");
};

export const config = {
  schedule: "*/15 * * * *",
};
