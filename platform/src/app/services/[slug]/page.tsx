import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, services } from "@/data/services";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) return {};

  return {
    title: service.metaTitle,
    description: service.description,
    alternates: {
      canonical: `/services/${service.slug}/`,
    },
    openGraph: {
      title: service.title,
      description: service.description,
      url: `/services/${service.slug}/`,
      images: [
        {
          url: "/assets/img/mustafa-full-stack-saas-engineer-angular-nodejs.jpg",
          width: 1200,
          height: 630,
          alt: "Muhammad Mustafa, full-stack SaaS and AI engineer",
        },
      ],
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) notFound();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: `https://aisaaswithmustafa.com/services/${service.slug}/`,
    areaServed: ["United Arab Emirates", "Malaysia", "Saudi Arabia", "Remote"],
    provider: {
      "@type": "Person",
      "@id": "https://aisaaswithmustafa.com/#person",
      name: "Muhammad Mustafa",
      jobTitle: "Full-Stack SaaS and AI Engineer",
      url: "https://aisaaswithmustafa.com/",
    },
    serviceType: service.shortTitle,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />

      <section className="page-hero service-hero">
        <div className="shell">
          <Link className="back-link" href="/services/">← All services</Link>
          <p className="eyebrow">{service.eyebrow}</p>
          <h1>{service.title}</h1>
          <p className="hero-copy">{service.description}</p>
          <div className="button-row">
            <a className="button" href="https://aisaaswithmustafa.com/#contact">Discuss this service</a>
            <a className="button button-ghost" href="https://aisaaswithmustafa.com/portfolio.html">View related work</a>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="shell outcome-grid">
          <div>
            <p className="eyebrow">Best fit</p>
            <h2>Who this service is for</h2>
            <p>{service.audience}</p>
          </div>
          <div>
            <p className="eyebrow">Expected outcomes</p>
            <ul className="check-list">
              {service.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section package-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Choose a starting point</p>
              <h2>Three delivery levels. One clear scope.</h2>
            </div>
            <p>Pricing is quoted after scope review—no invented fixed prices.</p>
          </div>
          <div className="package-grid">
            {service.packages.map((item, index) => (
              <article className={`package-card${index === 1 ? " package-featured" : ""}`} key={item.name}>
                {index === 1 && <span className="package-badge">Most common</span>}
                <p className="eyebrow">{item.fit}</p>
                <h3>{item.name}</h3>
                <p>{item.summary}</p>
                <ul className="check-list compact-list">
                  {item.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}
                </ul>
                <a className="button button-block" href="https://aisaaswithmustafa.com/#contact">
                  Request {item.name.toLowerCase()} scope
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell faq-layout">
          <div>
            <p className="eyebrow">Questions before starting</p>
            <h2>Clear answers, before a call.</h2>
          </div>
          <div className="faq-list">
            {service.faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="shell cta-panel">
          <div>
            <p className="eyebrow">Ready to scope it?</p>
            <h2>Tell me what you are building.</h2>
          </div>
          <a className="button" href="https://aisaaswithmustafa.com/#contact">Start a conversation</a>
        </div>
      </section>
    </main>
  );
}
