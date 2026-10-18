import Link from "next/link";
import type { Service } from "@/data/services";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="service-card">
      <p className="eyebrow">{service.eyebrow}</p>
      <h2>{service.shortTitle}</h2>
      <p>{service.description}</p>
      <ul className="tag-list" aria-label="Technologies">
        {service.technologies.slice(0, 4).map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
      <Link className="text-link" href={`/services/${service.slug}/`}>
        View service and packages <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
