export type ServicePackage = {
  name: "Basic" | "Standard" | "Premium";
  fit: string;
  summary: string;
  deliverables: string[];
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

export type Service = {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  shortTitle: string;
  description: string;
  audience: string;
  outcomes: string[];
  technologies: string[];
  packages: ServicePackage[];
  faqs: ServiceFaq[];
};

const standardPackages = (
  basic: string,
  standard: string,
  premium: string,
): ServicePackage[] => [
  {
    name: "Basic",
    fit: "Clear, focused requirement",
    summary: basic,
    deliverables: [
      "Scope and technical plan",
      "One focused production deliverable",
      "Handover notes and next-step guidance",
    ],
  },
  {
    name: "Standard",
    fit: "A complete product milestone",
    summary: standard,
    deliverables: [
      "Architecture and implementation",
      "Core integrations and testing",
      "Deployment support and documentation",
    ],
  },
  {
    name: "Premium",
    fit: "End-to-end product delivery",
    summary: premium,
    deliverables: [
      "Full delivery roadmap",
      "Production build across agreed milestones",
      "Launch, monitoring and post-launch support",
    ],
  },
];

export const services: Service[] = [
  {
    slug: "ai-saas-product-development",
    eyebrow: "AI product engineering",
    title: "AI SaaS Product Development for Real Business Workflows",
    metaTitle: "AI SaaS Product Development Services",
    shortTitle: "AI SaaS Product Development",
    description:
      "Design and build useful AI product features including assistants, retrieval workflows, scoring, summaries and secure model integrations.",
    audience:
      "Startups and product teams that need an AI feature connected to real users, data and business operations.",
    outcomes: [
      "A practical AI workflow with human review where it matters",
      "Secure application and model integration",
      "A maintainable product foundation instead of an isolated demo",
    ],
    technologies: ["OpenAI", "Claude", "Next.js", "Node.js", "PostgreSQL"],
    packages: standardPackages(
      "Validate and implement one focused AI workflow.",
      "Build a production AI feature with application and data integration.",
      "Deliver a broader AI-enabled SaaS product from architecture through launch.",
    ),
    faqs: [
      {
        question: "Can you add AI to an existing SaaS product?",
        answer:
          "Yes. I can assess the existing product, select the smallest useful workflow and integrate it without forcing a full rewrite.",
      },
      {
        question: "Do you only build chatbots?",
        answer:
          "No. The work can include retrieval, classification, summaries, scoring, structured extraction, automation and human-review flows.",
      },
      {
        question: "How is the project priced?",
        answer:
          "Pricing follows the agreed scope, integrations, risk and delivery milestones. I confirm a written scope before quoting.",
      },
    ],
  },
  {
    slug: "multi-tenant-saas-development",
    eyebrow: "SaaS architecture",
    title: "Multi-Tenant SaaS Platform Development",
    metaTitle: "Multi-Tenant SaaS Development Services",
    shortTitle: "Multi-Tenant SaaS Platforms",
    description:
      "Build secure B2B SaaS products with organisation isolation, permissions, subscriptions, real-time data and dependable backend services.",
    audience:
      "Founders and teams building or modernising a subscription product for multiple organisations and user roles.",
    outcomes: [
      "Tenant-aware data access and role permissions",
      "Subscription and billing foundations",
      "A product architecture that can grow without losing control",
    ],
    technologies: ["Supabase", "PostgreSQL", "Stripe", "RBAC", "Next.js"],
    packages: standardPackages(
      "Design the data model, access rules and first tenant-aware workflow.",
      "Build a complete SaaS milestone with roles, data and subscriptions.",
      "Deliver the multi-tenant product foundation through production launch.",
    ),
    faqs: [
      {
        question: "Can you work with an existing SaaS codebase?",
        answer:
          "Yes. I can review the current architecture, identify isolation or permission risks and deliver a staged improvement plan.",
      },
      {
        question: "Can the platform support several roles?",
        answer:
          "Yes. Roles and permissions are designed around actual product actions, then enforced in both the application and data layer.",
      },
      {
        question: "Do you integrate subscription billing?",
        answer:
          "Yes. I work with Stripe subscriptions, webhooks, customer portals and tenant-aware billing workflows.",
      },
    ],
  },
  {
    slug: "react-nextjs-development",
    eyebrow: "Modern front ends",
    title: "React and Next.js Product Development",
    metaTitle: "React & Next.js Development Services",
    shortTitle: "React & Next.js Development",
    description:
      "Create responsive product interfaces and web applications with reusable components, clean state management and production-focused performance.",
    audience:
      "Businesses that need a new React product, a focused feature or experienced help improving an existing Next.js application.",
    outcomes: [
      "Responsive interfaces built around real workflows",
      "Reusable, maintainable component architecture",
      "Performance, accessibility and deployment considered from the start",
    ],
    technologies: ["React", "Next.js", "TypeScript", "TanStack Query", "PWA"],
    packages: standardPackages(
      "Build one focused page, workflow or reusable interface feature.",
      "Deliver a complete application milestone with API integration.",
      "Build and launch a full product interface with ongoing technical support.",
    ),
    faqs: [
      {
        question: "Can you improve an existing React application?",
        answer:
          "Yes. I can diagnose architecture, rendering, state, accessibility and performance issues before changing the code.",
      },
      {
        question: "Can you build an offline-capable web app?",
        answer:
          "Yes, where the product benefits from it. This can include service workers, persisted data and controlled synchronisation after reconnecting.",
      },
      {
        question: "Will the application be SEO friendly?",
        answer:
          "For public pages, I use server rendering or static generation, useful page content, metadata and crawlable internal links.",
      },
    ],
  },
  {
    slug: "nodejs-api-backend-development",
    eyebrow: "Backend systems",
    title: "Node.js API and Backend Development",
    metaTitle: "Node.js API & Backend Development",
    shortTitle: "Node.js APIs & Backends",
    description:
      "Develop production APIs, integrations and backend services with clear ownership, validation, observability and reliable failure handling.",
    audience:
      "Product teams that need a new API, a third-party integration or help stabilising an existing Node.js backend.",
    outcomes: [
      "Clear API contracts and data validation",
      "Reliable third-party integrations and webhook handling",
      "Maintainable services with practical operational visibility",
    ],
    technologies: ["Node.js", "TypeScript", "REST APIs", "PostgreSQL", "Webhooks"],
    packages: standardPackages(
      "Implement one API endpoint, integration or backend workflow.",
      "Deliver a complete backend milestone with data and integrations.",
      "Design and build the backend foundation for a production product.",
    ),
    faqs: [
      {
        question: "Can you integrate third-party platforms?",
        answer:
          "Yes. I work with documented APIs and webhooks, including authentication, retries, validation and failure handling.",
      },
      {
        question: "Can you diagnose an unreliable backend?",
        answer:
          "Yes. I start with logs, data flow and reproducible failures, then propose the smallest safe fix before wider changes.",
      },
      {
        question: "Do you provide deployment support?",
        answer:
          "Yes. Deployment, environment configuration and a clear handover can be included in the agreed milestone.",
      },
    ],
  },
  {
    slug: "angular-modernisation",
    eyebrow: "Enterprise front ends",
    title: "Angular Application Modernisation and Version Upgrades",
    metaTitle: "Angular Modernisation & Upgrade Services",
    shortTitle: "Angular Modernisation",
    description:
      "Modernise large Angular applications through staged upgrades, focused refactoring, performance work and safer migration planning.",
    audience:
      "Teams maintaining long-running Angular or AngularJS applications that need a controlled path forward without stopping product delivery.",
    outcomes: [
      "A staged upgrade plan with visible risks and dependencies",
      "Focused refactoring around the most expensive problem areas",
      "A safer, more maintainable application foundation",
    ],
    technologies: ["Angular", "TypeScript", "RxJS", "NgRx", "AngularJS"],
    packages: standardPackages(
      "Audit the application and complete one focused upgrade or fix.",
      "Deliver a staged version upgrade or modernisation milestone.",
      "Lead a wider migration programme with testing and release support.",
    ),
    faqs: [
      {
        question: "Can you upgrade several Angular versions?",
        answer:
          "Yes. I prefer staged version upgrades so framework, dependency and application problems remain easier to isolate.",
      },
      {
        question: "Do you work with AngularJS migrations?",
        answer:
          "Yes. The right approach depends on the product, team and release constraints, so I begin with an architecture and dependency assessment.",
      },
      {
        question: "Can modernisation happen alongside feature work?",
        answer:
          "Usually, yes. I plan milestones around business priorities so improvement work does not become an open-ended rewrite.",
      },
    ],
  },
  {
    slug: "saas-authentication-billing-integrations",
    eyebrow: "Product infrastructure",
    title: "SaaS Authentication, Billing and Integration Development",
    metaTitle: "SaaS Auth, Billing & Integration Services",
    shortTitle: "SaaS Auth, Billing & Integrations",
    description:
      "Connect the infrastructure a SaaS product depends on: secure sign-in, permissions, subscription billing and operational integrations.",
    audience:
      "SaaS teams that need production-ready access control, billing or third-party workflows without fragile shortcuts.",
    outcomes: [
      "Authentication and permissions aligned with product roles",
      "Billing flows that account for webhooks and state changes",
      "Integrations designed with validation and recovery paths",
    ],
    technologies: ["Clerk", "Supabase Auth", "Stripe", "RBAC", "Webhooks"],
    packages: standardPackages(
      "Implement one focused authentication, billing or integration workflow.",
      "Connect several product-infrastructure workflows as one milestone.",
      "Deliver the access, billing and integration foundation for a SaaS launch.",
    ),
    faqs: [
      {
        question: "Can you add role-based access control?",
        answer:
          "Yes. I map permissions to real actions and enforce them consistently across the interface, API and data access rules.",
      },
      {
        question: "Can you fix Stripe webhook problems?",
        answer:
          "Yes. I can trace event processing, duplicated or delayed events, subscription state and application-side failure handling.",
      },
      {
        question: "Can these services be added to an existing product?",
        answer:
          "Yes. The work can be scoped as an isolated milestone with an assessment of the current code and data model first.",
      },
    ],
  },
];

export const getService = (slug: string) =>
  services.find((service) => service.slug === slug);
