export type ServicePackage = {
  name: "Basic" | "Standard" | "Premium";
  fit: string;
  summary: string;
  delivery: string;
  revisions: string;
  included: string[];
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

export type PortfolioItem = {
  title: string;
  image: string;
  alt: string;
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
  portfolio: PortfolioItem[];
  tags: string[];
};

export const services: Service[] = [
  {
    slug: "ai-saas-product-development",
    eyebrow: "SaaS and AI product development",
    title: "I will build a production-ready SaaS or AI web application",
    metaTitle: "Hire a Full-Stack SaaS & AI Developer",
    shortTitle: "Full-Stack SaaS & AI Development",
    description:
      "Work directly with a senior full-stack engineer to plan, build and launch a maintainable SaaS product, AI workflow or production web application.",
    audience:
      "Founders, startups and product teams that need direct technical ownership without coordinating several disconnected specialists.",
    outcomes: [
      "A clear architecture and milestone plan before major implementation",
      "Responsive product interfaces connected to secure APIs and data",
      "Practical authentication, permissions, billing or AI integrations where required",
      "Deployment support, documentation and a maintainable handover",
    ],
    technologies: [
      "React",
      "Next.js",
      "Node.js",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "OpenAI",
      "Stripe",
    ],
    packages: [
      {
        name: "Basic",
        fit: "Focused build",
        summary: "One clearly defined product feature or technical workflow.",
        delivery: "Focused milestone",
        revisions: "Scoped feedback rounds",
        included: [
          "Technical plan",
          "Responsive product feature",
          "Testing and handover notes",
        ],
      },
      {
        name: "Standard",
        fit: "Product milestone",
        summary: "A complete SaaS milestone combining interface, backend and integrations.",
        delivery: "Complete milestone",
        revisions: "Milestone feedback rounds",
        included: [
          "Architecture and product flow",
          "Responsive front end",
          "Backend API and database",
          "Authentication or third-party integration",
          "Testing and deployment support",
        ],
      },
      {
        name: "Premium",
        fit: "End-to-end delivery",
        summary: "A production product delivered across agreed milestones from planning to launch.",
        delivery: "End-to-end roadmap",
        revisions: "Milestone-based review",
        included: [
          "Product and architecture roadmap",
          "Full-stack application development",
          "Roles, billing or AI workflows",
          "Production integrations",
          "Launch and monitoring setup",
          "Post-launch support plan",
        ],
      },
    ],
    faqs: [
      {
        question: "Which package should I choose?",
        answer:
          "Choose Basic for one well-defined feature, Standard for a complete product milestone, and Premium when you need broader ownership from architecture through launch. I will confirm the right scope before work begins.",
      },
      {
        question: "Can you work on an existing SaaS product?",
        answer:
          "Yes. I can review the current codebase, identify the safest delivery path and work within the existing architecture where that is the right decision.",
      },
      {
        question: "Can you integrate AI into an existing application?",
        answer:
          "Yes. This can include assistants, retrieval workflows, classification, summaries, scoring, automation and human-review steps connected to your existing product data.",
      },
      {
        question: "Do you provide authentication, billing and third-party integrations?",
        answer:
          "Yes. I work with role-based access, Supabase or Clerk authentication, Stripe billing, documented APIs and reliable webhook workflows.",
      },
      {
        question: "How are delivery time and price decided?",
        answer:
          "Both depend on the agreed requirements, integrations and technical risk. After a short scope review, you receive a written milestone plan and quote instead of an unreliable generic estimate.",
      },
      {
        question: "Do you provide support after launch?",
        answer:
          "Yes. Monitoring, maintenance, improvements and planned product support can be included as a separate ongoing engagement.",
      },
    ],
    portfolio: [
      {
        title: "CultureAI",
        image: "/assets/img/portfolio/cultureai-ai-saas-dashboard.jpg",
        alt: "CultureAI employee engagement SaaS dashboard built by Muhammad Mustafa",
      },
      {
        title: "AutoLeap",
        image: "/assets/img/portfolio/autoleap-saas-dashboard.jpg",
        alt: "AutoLeap automotive SaaS dashboard engineering project",
      },
      {
        title: "Apex Logistics",
        image: "/assets/img/portfolio/apex-logistics-platform.jpg",
        alt: "Apex Logistics React and SaaS freight platform",
      },
    ],
    tags: [
      "SaaS development",
      "AI product development",
      "Full-stack developer",
      "Next.js developer",
      "Node.js developer",
      "UAE software engineer",
    ],
  },
];

export const getService = (slug: string) =>
  services.find((service) => service.slug === slug);
