"use client";

import { useState } from "react";
import type { ServicePackage } from "@/data/services";

export function GigPackagePanel({
  packages,
  instance,
}: {
  packages: ServicePackage[];
  instance: "desktop" | "mobile";
}) {
  const [activePackage, setActivePackage] = useState(1);
  const selected = packages[activePackage];

  return (
    <aside className="gig-order-card" aria-label="Choose a service package">
      <div className="package-tabs" role="tablist" aria-label="Service packages">
        {packages.map((item, index) => (
          <button
            aria-controls={`${instance}-selected-package`}
            aria-selected={activePackage === index}
            className={activePackage === index ? "is-active" : ""}
            id={`${instance}-package-${item.name.toLowerCase()}`}
            key={item.name}
            onClick={() => setActivePackage(index)}
            role="tab"
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${instance}-package-${selected.name.toLowerCase()}`}
        className="selected-package"
        id={`${instance}-selected-package`}
        role="tabpanel"
      >
        <div className="package-title-row">
          <div>
            <span>{selected.fit}</span>
            <h2>{selected.name} package</h2>
          </div>
          <strong>Custom quote</strong>
        </div>
        <p>{selected.summary}</p>
        <div className="package-meta">
          <span><b aria-hidden="true">◷</b> {selected.delivery}</span>
          <span><b aria-hidden="true">↻</b> {selected.revisions}</span>
        </div>
        <ul className="gig-check-list">
          {selected.included.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <a className="gig-primary-button" href="https://aisaaswithmustafa.com/#contact">
          Continue <span aria-hidden="true">→</span>
        </a>
        <a className="gig-secondary-button" href="mailto:mustufa50@gmail.com?subject=SaaS%20or%20AI%20development%20project">
          Contact me
        </a>
      </div>

      <div className="flexible-hiring">
        <span className="seller-avatar seller-avatar-small" aria-hidden="true">MM</span>
        <p><strong>Need flexibility when hiring?</strong><br />Ask about a custom milestone.</p>
      </div>
    </aside>
  );
}
