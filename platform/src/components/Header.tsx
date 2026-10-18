import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Mustafa service platform home">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>
            <strong>Muhammad Mustafa</strong>
            <small>Full-Stack SaaS & AI Engineer</small>
          </span>
        </Link>
        <div className="header-actions">
          <nav className="desktop-nav" aria-label="Primary navigation">
            <Link href="/services/">Services</Link>
            <a href="https://aisaaswithmustafa.com/portfolio.html">Work</a>
            <a href="https://aisaaswithmustafa.com/blog/index.html">Blog</a>
            <Link className="button button-small" href="/start-project/">
              Start a project
            </Link>
          </nav>
          <ThemeSwitcher />
          <details className="mobile-nav">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              <Link href="/services/">Services</Link>
              <a href="https://aisaaswithmustafa.com/portfolio.html">Work</a>
              <a href="https://aisaaswithmustafa.com/blog/index.html">Blog</a>
              <Link href="/start-project/">Start a project</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
