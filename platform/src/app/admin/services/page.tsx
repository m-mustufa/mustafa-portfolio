import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Service Admin Foundation",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServiceAdminPage() {
  return (
    <main>
      <section className="page-hero admin-hero">
        <div className="shell section-heading">
          <div>
            <p className="eyebrow">Development workspace</p>
            <h1>Service page admin</h1>
            <p>Create structured service drafts now. Authentication and one-click publishing come in the next milestone.</p>
          </div>
          <Link className="button" href="/admin/services/new/">Create service draft</Link>
        </div>
      </section>
      <section className="section section-tight">
        <div className="shell admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Service</th><th>URL</th><th>Packages</th><th>Output</th></tr></thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.slug}>
                  <td><strong>{service.shortTitle}</strong><small>{service.eyebrow}</small></td>
                  <td>/services/{service.slug}/</td>
                  <td>{service.packages.length}</td>
                  <td><Link href={`/services/${service.slug}/`}>View page →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
