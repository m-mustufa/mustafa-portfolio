import type { Metadata } from "next";
import { ServiceDraftBuilder } from "@/components/ServiceDraftBuilder";

export const metadata: Metadata = {
  title: "Create Service Draft",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewServicePage() {
  return (
    <main>
      <section className="page-hero admin-hero">
        <div className="shell narrow-copy">
          <p className="eyebrow">Admin foundation</p>
          <h1>Create a service-page draft.</h1>
          <p>This first working step converts the core commercial-page fields into a clean, URL-ready draft.</p>
        </div>
      </section>
      <section className="section section-tight">
        <div className="shell"><ServiceDraftBuilder /></div>
      </section>
    </main>
  );
}
