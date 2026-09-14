import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GigGallery } from "@/components/GigGallery";
import { GigPackagePanel } from "@/components/GigPackagePanel";
import { getService, services } from "@/data/services";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = "https://aisaaswithmustafa.com";

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
          url: "/assets/img/mustafa-saas-ai-development-gig-cover.jpg",
          width: 1200,
          height: 630,
          alt: "Full-stack SaaS and AI development portfolio by Muhammad Mustafa",
        },
      ],
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) notFound();

  const serviceUrl = `${siteUrl}/services/${service.slug}/`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.shortTitle,
      description: service.description,
      url: serviceUrl,
      areaServed: ["United Arab Emirates", "Malaysia", "Saudi Arabia", "Remote"],
      provider: {
        "@type": "Person",
        "@id": `${siteUrl}/#person`,
        name: "Muhammad Mustafa",
        jobTitle: "Full-Stack SaaS and AI Engineer",
        url: `${siteUrl}/`,
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "SaaS and AI development packages",
        itemListElement: service.packages.map((item) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: `${item.name} - ${item.fit}`,
            description: item.summary,
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}/services/` },
        { "@type": "ListItem", position: 3, name: service.shortTitle, item: serviceUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  const comparisonRows = [
    { label: "Best for", values: service.packages.map((item) => item.fit) },
    { label: "Delivery", values: service.packages.map((item) => item.delivery) },
    { label: "Feedback", values: service.packages.map((item) => item.revisions) },
    { label: "Planning", values: ["Included", "Included", "Included"] },
    { label: "Front-end development", values: ["Focused feature", "Included", "Included"] },
    { label: "Backend and database", values: ["As scoped", "Included", "Included"] },
    { label: "Auth, billing or AI", values: ["As scoped", "One workflow", "Multiple workflows"] },
    { label: "Deployment support", values: ["Handover", "Included", "Included"] },
  ];

  return (
    <main className="gig-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      <div className="gig-shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span>
          <Link href="/services/">Services</Link><span aria-hidden="true">/</span>
          <span aria-current="page">SaaS &amp; AI Development</span>
        </nav>

        <div className="gig-layout">
          <div className="gig-main-column">
            <section className="gig-intro" aria-labelledby="gig-title">
              <p className="gig-category">{service.eyebrow}</p>
              <h1 id="gig-title">{service.title}</h1>
              <div className="seller-row">
                <Image
                  alt="Muhammad Mustafa, full-stack SaaS and AI engineer"
                  className="seller-photo"
                  height={52}
                  priority
                  src="/assets/img/muhammad-mustafa-avatar.webp"
                  width={52}
                />
                <div>
                  <strong>Muhammad Mustafa</strong>
                  <p>Senior full-stack engineer <span aria-hidden="true">•</span> 10+ years&apos; experience</p>
                </div>
              </div>
            </section>

            <GigGallery
              images={[
                {
                  src: "/assets/img/mustafa-saas-ai-development-gig-cover.jpg",
                  alt: "Full-stack SaaS and AI development projects including CultureAI, Apex Logistics and BWL League",
                  label: "Service overview",
                },
                ...service.portfolio.map((item) => ({
                  src: item.image,
                  alt: item.alt,
                  label: item.title,
                })),
              ]}
            />

            <div className="gig-mobile-order">
              <GigPackagePanel instance="mobile" packages={service.packages} serviceSlug={service.slug} />
            </div>

            <section className="gig-summary" aria-labelledby="summary-title">
              <div className="summary-heading">
                <span aria-hidden="true">✦</span>
                <h2 id="summary-title">Service summary</h2>
              </div>
              <ul>
                <li>Direct delivery by one senior engineer from architecture through launch.</li>
                <li>Production SaaS, AI, React, Next.js, Node.js and integration experience.</li>
                <li>Clear milestones, practical trade-offs and maintainable handover.</li>
                <li>Available for UAE businesses and remote product teams.</li>
              </ul>
            </section>

            <section className="gig-section client-proof" aria-labelledby="proof-title">
              <div className="gig-section-heading">
                <h2 id="proof-title">What clients value</h2>
                <a href="https://aisaaswithmustafa.com/#testimonials">See more feedback</a>
              </div>
              <blockquote>
                <div className="review-topline">
                  <Image alt="adennis60 client profile" height={42} src="/assets/img/adennis60.webp" width={42} />
                  <div><strong>adennis60</strong><span>United Kingdom</span></div>
                  <span className="review-stars" aria-label="Five star review">★★★★★</span>
                </div>
                <p>“Stripe integration is done! Thanks, Mustafa, for your work. I will definitely work with you again.”</p>
              </blockquote>
            </section>

            <section className="gig-section prose-section" aria-labelledby="about-title">
              <h2 id="about-title">About this service</h2>
              <p>{service.description}</p>
              <p>{service.audience}</p>
              <h3>What you can hire me to build</h3>
              <ul className="plain-list">
                {service.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
              </ul>
              <h3>Technology and delivery experience</h3>
              <p>
                I work across the product stack, including React and Next.js interfaces,
                Node.js APIs, PostgreSQL and Supabase data, authentication, Stripe billing,
                AI model integrations and production deployment.
              </p>
              <div className="expertise-grid">
                <div><span>Application type</span><strong>SaaS, AI and web products</strong></div>
                <div><span>Engagement</span><strong>Milestone or end to end</strong></div>
                <div><span>Primary stack</span><strong>React, Next.js and Node.js</strong></div>
              </div>
            </section>

            <section className="gig-section" aria-labelledby="portfolio-title">
              <h2 id="portfolio-title">Selected production work</h2>
              <div className="gig-portfolio-grid">
                {service.portfolio.map((item) => (
                  <a href="https://aisaaswithmustafa.com/portfolio.html" key={item.title}>
                    <Image alt={item.alt} height={338} loading="lazy" src={item.image} width={600} />
                    <span>{item.title}</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="gig-section" aria-labelledby="compare-title">
              <h2 id="compare-title">Compare packages</h2>
              <div className="comparison-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr><th>Package</th>{service.packages.map((item) => <th key={item.name}><strong>{item.name}</strong><span>Custom quote</span></th>)}</tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label}>
                        <th>{row.label}</th>
                        {row.values.map((value, index) => <td key={`${row.label}-${service.packages[index].name}`}>{value}</td>)}
                      </tr>
                    ))}
                    <tr className="comparison-actions">
                      <th>Next step</th>
                      {service.packages.map((item) => (
                        <td key={item.name}>
                          <Link href={`/start-project/?service=${encodeURIComponent(service.slug)}&package=${encodeURIComponent(item.name)}`}>
                            Select
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="gig-section" aria-labelledby="faq-title">
              <h2 id="faq-title">Frequently asked questions</h2>
              <div className="gig-faq-list">
                {service.faqs.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="gig-section related-tags" aria-labelledby="tags-title">
              <h2 id="tags-title">Related expertise</h2>
              <ul>{service.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            </section>
          </div>

          <div className="gig-sidebar">
            <GigPackagePanel instance="desktop" packages={service.packages} serviceSlug={service.slug} />
          </div>
        </div>
      </div>
    </main>
  );
}
