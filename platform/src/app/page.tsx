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
            <h1>Choose the SaaS or AI outcome you need.</h1>
            <p className="hero-copy">
              Focused engineering services for founders and product teams—from a
              defined milestone to a complete production launch.
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
              <p className="eyebrow">Popular services</p>
              <h2>Start with a clear delivery path.</h2>
            </div>
            <Link className="text-link" href="/services/">View all services →</Link>
          </div>
          <div className="service-grid service-grid-three">
            {services.slice(0, 3).map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
