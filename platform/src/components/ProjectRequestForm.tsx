"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Service } from "@/data/services";

const formEndpoint = "https://formspree.io/f/xjkrnwyl";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function ProjectRequestForm({ service }: { service: Service }) {
  const [selectedPackage, setSelectedPackage] = useState(service.packages[1]);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  useEffect(() => {
    const requestedPackage = new URLSearchParams(window.location.search).get("package");
    const matchingPackage = service.packages.find(
      (item) => item.name.toLowerCase() === requestedPackage?.toLowerCase(),
    );

    if (matchingPackage) setSelectedPackage(matchingPackage);
  }, [service.packages]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmissionState("submitting");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Project request could not be submitted.");

      form.reset();
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  if (submissionState === "success") {
    return (
      <section className="request-success" aria-labelledby="request-success-title">
        <span className="request-success-icon" aria-hidden="true">✓</span>
        <p className="eyebrow">Request received</p>
        <h2 id="request-success-title">Thanks. I’ll review it personally.</h2>
        <p>Your selected package and project details have been sent successfully.</p>
        <div className="button-row">
          <Link className="button" href={`/services/${service.slug}/`}>Back to the service</Link>
          <Link className="button button-ghost" href="/">Return home</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="request-layout">
      <aside className="request-summary" aria-labelledby="selected-service-title">
        <p className="eyebrow">Selected service</p>
        <h2 id="selected-service-title">{service.shortTitle}</h2>
        <div className="request-package">
          <span>{selectedPackage.name} package</span>
          <strong>{selectedPackage.fit}</strong>
          <p>{selectedPackage.summary}</p>
        </div>
        <ul className="request-next-steps">
          <li><span>01</span>I review the request personally.</li>
          <li><span>02</span>We clarify scope and technical risks.</li>
          <li><span>03</span>You receive practical next steps and a quote.</li>
        </ul>
        <Link className="text-link" href={`/services/${service.slug}/`}>Review service details →</Link>
      </aside>

      <form
        action={formEndpoint}
        className="project-request-form"
        method="POST"
        onSubmit={submitRequest}
      >
        <input name="_subject" type="hidden" value={`${selectedPackage.name} ${service.shortTitle} enquiry`} />
        <input name="service" type="hidden" value={service.shortTitle} />
        <input name="service_slug" type="hidden" value={service.slug} />
        <input name="package" type="hidden" value={selectedPackage.name} />
        <label className="request-honeypot" aria-hidden="true">
          Leave this field empty
          <input autoComplete="off" name="_gotcha" tabIndex={-1} type="text" />
        </label>

        <div className="request-form-heading">
          <p className="eyebrow">Project details</p>
          <h2>Tell me enough to recommend the right next step.</h2>
          <p>No payment is taken here. I’ll confirm scope and pricing with you first.</p>
        </div>

        <div className="request-fields">
          <label>
            Your name
            <input autoComplete="name" name="name" placeholder="Your name" required type="text" />
          </label>
          <label>
            Work email
            <input autoComplete="email" name="email" placeholder="you@company.com" required type="email" />
          </label>
          <label>
            Company <span>(optional)</span>
            <input autoComplete="organization" name="company" placeholder="Company or product" type="text" />
          </label>
          <label>
            Approximate budget
            <select defaultValue="" name="budget" required>
              <option disabled value="">Choose a range</option>
              <option value="Under USD 2,000">Under USD 2,000</option>
              <option value="USD 2,000–5,000">USD 2,000–5,000</option>
              <option value="USD 5,000–10,000">USD 5,000–10,000</option>
              <option value="USD 10,000+">USD 10,000+</option>
              <option value="Need guidance">Need guidance</option>
            </select>
          </label>
          <label>
            Preferred timeline
            <select defaultValue="" name="timeline" required>
              <option disabled value="">Choose a timeline</option>
              <option value="As soon as practical">As soon as practical</option>
              <option value="Within one month">Within one month</option>
              <option value="Within 1–3 months">Within 1–3 months</option>
              <option value="Flexible">Flexible</option>
            </select>
          </label>
          <label>
            Preferred contact
            <select defaultValue="Email" name="preferred_contact">
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Video call">Video call</option>
            </select>
          </label>
          <label className="request-field-full">
            What are you building?
            <textarea
              minLength={30}
              name="message"
              placeholder="Share the product, current stage, important integrations and the outcome you need."
              required
              rows={7}
            />
          </label>
        </div>

        <div className="request-submit-row">
          <button className="button" disabled={submissionState === "submitting"} type="submit">
            {submissionState === "submitting" ? "Sending…" : "Send project request"}
          </button>
          <p>Your details are used only to respond to this project request.</p>
        </div>

        {submissionState === "error" && (
          <p className="request-error" role="alert">
            The form could not send right now. Email me directly at{" "}
            <a href="mailto:mustufa50@gmail.com">mustufa50@gmail.com</a>.
          </p>
        )}
      </form>
    </div>
  );
}
