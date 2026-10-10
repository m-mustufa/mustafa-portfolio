const CORE_PROFILE = `
Identity and positioning:
- Muhammad Mustafa is a senior full-stack SaaS and AI engineer with 11+ years of professional experience.
- He works directly with startups, SMEs and product teams, including UAE businesses and remote clients.
- He handles complete products and focused milestones such as integrations, modernization, debugging and production support.
- His work is product engineering: architecture, implementation, deployment, reliability and maintainability, not only visual website development.
`.trim();

const KNOWLEDGE_TOPICS = [
  {
    id: "experience",
    keywords: ["experience", "years", "senior", "background", "career", "resume", "cv", "about you", "who are you"],
    content: `
Experience:
- Mustafa has 11+ years of professional full-stack engineering experience.
- He worked at Creative Chaos from February 2016 to March 2020, joined AutoLeap in May 2020 as a Front-End Engineer, and moved into a Full-Stack Engineer role in July 2022.
- He is a senior engineer at AutoLeap, technical co-founder and lead engineer at StartStorez, and the solo builder of CultureAI.
- He has six years of fully remote collaboration experience with a Canadian product team and is comfortable working asynchronously across time zones.
- His strongest published areas are Angular enterprise applications, React and Next.js products, Node.js APIs, SaaS architecture, databases, billing, authentication and production AI integrations.
- Do not invent an exact career start date, employer timeline, degree, certification or location when it is not provided here.
`.trim()
  },
  {
    id: "angular",
    keywords: ["angular", "rxjs", "ngrx", "typescript", "enterprise frontend", "legacy", "migration", "upgrade", "frontend"],
    content: `
Angular and enterprise frontend work:
- Mustafa works on complex Angular frontends in AutoLeap's established production SaaS codebase.
- He led the Angular upgrade path from version 8 through version 19 while maintaining stable continuous releases.
- He built Workboard 2.0 from scratch: a Kanban workflow with drag-and-drop, technician assignment, custom tags and multi-tab support.
- He has owned 10+ product modules end to end, including Repair Orders, Purchase Orders, Oil Change Stickers and Tire Storage.
- His published AutoLeap record includes resolving 642 Jira tickets across 2,800+ commits.
- His performance work includes fixing memory leaks, reducing unnecessary rendering and data loading, and adding lazy scrolling across 8+ list views.
- He contributes to a ground-up Next.js 16 modernization of the legacy Angular platform, with production modules and test coverage.
- His wider Angular experience includes RxJS and NgRx state flows, debugging, accessibility and long-term maintenance.
- He can help with a new Angular feature, a focused production bug, or a staged modernization of an older application.
- AutoLeap is a team product. Describe Mustafa's engineering contribution without claiming that he personally built the whole platform or every product feature.
`.trim()
  },
  {
    id: "react-next",
    keywords: ["react", "next", "nextjs", "next.js", "tanstack", "pwa", "offline", "frontend", "web app"],
    content: `
React and Next.js work:
- Mustafa builds responsive React and Next.js applications with TypeScript, accessible interfaces and maintainable state management.
- Apex Logistics is a solo-built GCC freight marketplace using React 19, TypeScript, TanStack Start and Firestore, with driver bidding, realtime workflows, offline-ready behavior and reconnect handling.
- JobHunter is a solo-built AI job-discovery and CV-tailoring application using React and Next.js. It discovers live vacancies, matches them against candidate experience and uses Claude to generate job-specific CVs.
- BWL League uses Next.js for a multi-role sports platform with live product workflows.
- At Creative Chaos, Mustafa built the frontend for Klose Care, a responsive React application for diabetic patient management.
`.trim()
  },
  {
    id: "backend-data",
    keywords: ["node", "nodejs", "node.js", "api", "backend", "database", "postgres", "postgresql", "mongodb", "supabase", "webhook", "integration"],
    content: `
Backend, APIs and data:
- Mustafa builds Node.js and Express REST APIs, third-party integrations, background workflows and webhook-based systems.
- His published data stack includes Supabase, PostgreSQL and MongoDB.
- He works with tenant-aware data access, practical data modelling, realtime features and Supabase Row Level Security.
- His integration experience includes Stripe, Slack, Twilio, Xero OAuth2 and external business APIs.
- His authentication and security experience includes JWT, OAuth2, OIDC, RBAC, API-key management and session management.
- His published cloud and delivery tools include Vercel, DigitalOcean, GitHub Actions, CI/CD, Git and GitHub.
- He designs backend services for clear ownership, reliability and maintainability rather than treating the API as a thin demo layer.
`.trim()
  },
  {
    id: "saas",
    keywords: ["saas", "multi tenant", "multi-tenant", "tenant", "subscription", "billing", "stripe", "rbac", "authentication", "sso", "roles", "permissions"],
    content: `
SaaS product engineering:
- Mustafa works on multi-tenant SaaS products with organization-isolated data, onboarding, dashboards, subscriptions and role-aware product flows.
- AutoLeap is an enterprise automotive SaaS platform serving 5,000+ repair shops across North America. This is a platform-level fact, not a claim that Mustafa built the entire product alone.
- He builds authentication, SSO and role-based access control for customers, teams and administrators.
- His Stripe work includes subscriptions, per-seat billing, Customer Portal integration and webhook-driven payment-state synchronization.
- CultureAI is direct evidence of end-to-end SaaS ownership: React and TypeScript frontend, Node.js and Express APIs, MongoDB, tenant isolation, anonymous employee feedback, OpenAI analysis, LLM streaming, Clerk authentication and SSO, role-based access, realtime analytics and Stripe billing.
`.trim()
  },
  {
    id: "ai",
    keywords: ["ai", "agent", "assistant", "chatbot", "rag", "openai", "groq", "llm", "automation", "summary", "scoring"],
    content: `
AI product engineering:
- Mustafa works with OpenAI and Claude APIs, LLM streaming, assistants, retrieval-backed search, scoring, summaries and workflow automation.
- His production focus includes tenant isolation, tool permissions, human approval, tracing, testing, cost limits and safe integration with the surrounding SaaS product.
- CultureAI uses AI-generated insights in an employee-engagement workflow.
- JobHunter discovers live vacancies, matches them to candidate experience and uses Claude to produce job-specific CVs.
- At AutoLeap, Mustafa designed an internal Cursor engineering workflow with 30 specialized agents, 26 commands, and path-scoped security and multi-tenancy rules. Describe this as an AI-assisted engineering workflow, not as a customer-facing AutoLeap AI product.
- Do not claim that OpenAI, RAG or vector search was part of a customer-facing AutoLeap feature; that is not verified in this context.
`.trim()
  },
  {
    id: "projects",
    keywords: ["project", "portfolio", "product", "built", "work", "example", "cultureai", "autoleap", "bwl", "apex", "jobhunter", "startstorez", "shopify"],
    content: `
Published project evidence:
- CultureAI: Mustafa is the solo builder of this live multi-tenant employee-engagement SaaS product. Its stack includes React, TypeScript, Node.js, Express, MongoDB, OpenAI, LLM streaming, Clerk, RBAC, realtime analytics and Stripe billing.
- AutoLeap: this is an established team product to which Mustafa contributes as a senior engineer. His verified work includes Workboard 2.0, ownership of 10+ modules, Angular v8-v19 upgrades, Angular and Next.js frontend work, Node.js APIs, third-party integrations, activity logging, internal admin tooling, performance work and production maintenance. Do not describe AutoLeap as a solo project.
- BWL League: a multi-role sports platform using Next.js, Supabase and realtime features for different roles and live workflows.
- Apex Logistics: Mustafa is the solo full-stack developer of this GCC freight marketplace using React 19, TypeScript, TanStack Start and Firestore. Verified work includes Firestore security rules, driver bidding, Xero OAuth2 server-side integration and investigation of a production-only Cloud Run failure.
- JobHunter: Mustafa is the solo full-stack developer of this AI job-discovery product. It finds live vacancies, matches candidate experience and uses Claude to generate job-specific CVs end to end.
- Shopify Social Image Automation: a Shopify integration that generates branded product imagery for WhatsApp and Open Graph sharing workflows.
- StartStorez: Mustafa co-founded the business and leads engineering. Published work includes delivery of 2,000+ Shopify stores, theme customization, app integration, payments, shipping, launch configuration, a pre-built niche-store catalogue, Shopify App Store apps, an AI SEO/AEO product-listing optimizer, WordPress maintenance and Shopify automation.
- Creative Chaos: earlier frontend work included Klose Care, Angular 8 CRUD features, Bank AL Habib's PyroCMS website, WordPress customization, Sketch-to-WordPress builds, Bootstrap and SASS.
`.trim()
  },
  {
    id: "delivery",
    keywords: ["process", "approach", "delivery", "timeline", "milestone", "architecture", "launch", "maintain", "support", "hire", "engagement"],
    content: `
Delivery approach:
- Mustafa can take a product from discovery and architecture through frontend, backend, database, authentication, billing, deployment and support.
- Work can be structured as a focused milestone, integration, modernization engagement or complete product delivery.
- He is comfortable with async communication and distributed delivery after six years working remotely with a Canadian product team.
- Before estimating, he needs the business goal, what already exists, required integrations and the desired timeline.
- He prefers clear scope, production-safe implementation and maintainable ownership over rushed demo-only delivery.
`.trim()
  },
  {
    id: "credentials",
    keywords: ["education", "degree", "diploma", "aptech", "ielts", "language", "english", "urdu", "certification", "certificate"],
    content: `
Education, languages and credentials:
- Mustafa completed a software engineering qualification at Aptech Computer Education from 2011 to 2014. The supplied documents describe it as an Advanced Diploma and as an Associate's Degree in Computer Software Engineering; do not choose a more specific label unless Mustafa confirms it.
- His IELTS overall band score is 7.0.
- He lists professional working proficiency in English and full professional proficiency in Urdu.
- His published certifications include Empowered Startups - Global Startup Accelerator Entrepreneur and Certified Empowered Startupper.
`.trim()
  },
  {
    id: "commercial",
    keywords: ["price", "pricing", "cost", "rate", "budget", "quote", "charge", "hourly", "fixed price", "upwork", "contact"],
    content: `
Commercial questions:
- Pricing is not fixed in the assistant knowledge. It depends on scope, existing code, integrations, delivery risk and whether the work is a milestone or a complete product.
- Never invent an hourly rate, fixed price, discount, deadline or contract term.
- Visitors can contact Mustafa through the website project form or use the published Upwork, LinkedIn, WhatsApp, email and Calendly links.
`.trim()
  },
  {
    id: "uae",
    keywords: ["uae", "dubai", "abu dhabi", "sharjah", "gcc", "remote", "timezone", "local"],
    content: `
UAE and remote work:
- Mustafa works with UAE businesses and remote product teams on SaaS, AI and web application projects.
- His services are presented for Dubai, Abu Dhabi, Sharjah and the wider UAE.
- He is based in Karachi, Pakistan and has six years of fully remote experience with a Canadian team.
- Do not invent a physical office address, visa status, nationality or travel commitment.
`.trim()
  }
];

const DEFAULT_TOPICS = ["experience", "projects", "delivery"];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTopic(topic, searchableText) {
  const paddedText = ` ${searchableText} `;
  return topic.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalize(keyword);
    return score + (paddedText.includes(` ${normalizedKeyword} `) ? 1 : 0);
  }, 0);
}

function selectKnowledge(question, history) {
  const recentHistory = Array.isArray(history)
    ? history.slice(-4).map((message) => message && message.content).filter(Boolean).join(" ")
    : "";
  const searchableText = normalize(`${question} ${recentHistory}`);
  const ranked = KNOWLEDGE_TOPICS
    .map((topic, index) => ({ topic, index, score: scoreTopic(topic, searchableText) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map((entry) => entry.topic);

  if (ranked.length) return ranked;
  return DEFAULT_TOPICS.map((id) => KNOWLEDGE_TOPICS.find((topic) => topic.id === id));
}

function cleanEnvironmentText(value, maxLength) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

function getAvailabilityContext(env) {
  const source = env || {};
  const status = cleanEnvironmentText(source.MUSTAFA_AVAILABILITY_STATUS, 24).toLowerCase();
  const note = cleanEnvironmentText(source.MUSTAFA_AVAILABILITY_NOTE, 180);
  const allowedStatuses = new Set(["open", "limited", "unavailable", "confirm"]);
  const resolvedStatus = allowedStatuses.has(status) ? status : "confirm";
  const instructions = {
    open: "Mustafa is currently accepting suitable new enquiries. Do not promise a start date; scope and timing still require direct confirmation.",
    limited: "Mustafa currently has limited capacity. Invite the visitor to share scope and timing, but do not promise a start date.",
    unavailable: "Mustafa is not currently accepting a new immediate engagement. The visitor may still share a future requirement, but do not imply current availability.",
    confirm: "Current availability has not been confirmed in this request. Say that scope and schedule must be checked directly; never say Mustafa is definitely free."
  };

  return `
Current availability — authoritative temporary setting:
- Status: ${resolvedStatus}
- Instruction: ${instructions[resolvedStatus]}
${note ? `- Current note: ${note}` : "- No additional availability note is set."}
- This temporary setting overrides any broad availability wording in profile or project history.
`.trim();
}

function buildKnowledgeContext(question, history, env) {
  const selectedTopics = selectKnowledge(question, history);
  return [CORE_PROFILE, getAvailabilityContext(env), ...selectedTopics.map((topic) => topic.content)].join("\n\n");
}

module.exports = {
  buildKnowledgeContext,
  getAvailabilityContext,
  selectKnowledge
};
