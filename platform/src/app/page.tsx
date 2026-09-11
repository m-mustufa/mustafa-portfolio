import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import { services } from "@/data/services";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">Production software, clearly packaged</p>
            <h1>Hire one senior engineer for your SaaS or AI product.</h1>
            <p className="hero-copy">
              Start with one focused service and choose the delivery level that
              matches your product—from a defined milestone to a complete launch.
            </p>
            <div className="button-row">
              <Link className="button" href="/services/">Explore services</Link>
              <a className="button button-ghost" href="https://aisaaswithmustafa.com/portfolio.html">
                See production work
              </a>
            </div>
          </div>
          <aside className="hero-proof">
            <p className="eyebrow">Direct technical ownership</p>
            <strong>10+ years</strong>
            <span>Full-stack product engineering</span>
            <strong>UAE + remote</strong>
            <span>Available for focused and end-to-end delivery</span>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Flagship service</p>
              <h2>One offer to review and improve first.</h2>
            </div>
            <Link className="text-link" href="/services/">View all services →</Link>
          </div>
          <div className="service-grid service-grid-three">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
