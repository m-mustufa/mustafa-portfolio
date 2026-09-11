import type { Metadata } from "next";
import { ServiceCard } from "@/components/ServiceCard";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Full-Stack SaaS & AI Development Service",
  description:
    "Review one flexible full-stack SaaS and AI development service with Basic, Standard and Premium delivery levels for UAE and remote teams.",
  alternates: {
    canonical: "/services/",
  },
};

export default function ServicesPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell narrow-copy">
          <p className="eyebrow">Flagship service</p>
          <h1>One flexible SaaS and AI development service.</h1>
          <p>
            Compare three delivery levels and start with a written scope. This
            focused offer keeps the hiring decision simple while adapting the
            final milestone plan to your product.
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
