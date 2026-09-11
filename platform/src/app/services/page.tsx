import type { Metadata } from "next";
import { ServiceCard } from "@/components/ServiceCard";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "SaaS & AI Development Services",
  description:
    "Compare packaged SaaS, AI, React, Next.js, Node.js, Angular, authentication and billing development services for UAE and remote teams.",
  alternates: {
    canonical: "/services/",
  },
};

export default function ServicesPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell narrow-copy">
          <p className="eyebrow">Service catalogue</p>
          <h1>Production engineering services, packaged clearly.</h1>
          <p>
            Choose a focused service, compare delivery levels and start with a
            written scope. Every package is adapted to the product rather than
            forcing the same checklist onto every business.
          </p>
        </div>
      </section>
      <section className="section section-tight">
        <div className="shell service-grid">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>
    </main>
  );
}
