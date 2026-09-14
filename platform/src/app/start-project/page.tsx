import type { Metadata } from "next";
import Link from "next/link";
import { ProjectRequestForm } from "@/components/ProjectRequestForm";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Start a SaaS or AI Development Project",
  description:
    "Send your SaaS, AI or full-stack development requirements to Muhammad Mustafa for a practical scope review and project quote.",
  alternates: { canonical: "/start-project/" },
};

export default function StartProjectPage() {
  const service = services[0];

  return (
    <main className="project-request-page">
      <section className="request-hero">
        <div className="shell">
          <nav className="request-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Start a project</span>
          </nav>
          <p className="eyebrow">Start a project</p>
          <h1>Tell me what you’re building.</h1>
          <p>Choose a package, share the essentials and get a scope-first response from the engineer who will do the work.</p>
        </div>
      </section>

      <section className="section request-section">
        <div className="shell">
          <ProjectRequestForm service={service} />
        </div>
      </section>
    </main>
  );
}
