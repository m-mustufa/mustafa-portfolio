import Link from "next/link";

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
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/services/">Services</Link>
          <a href="https://aisaaswithmustafa.com/portfolio.html">Work</a>
          <a href="https://aisaaswithmustafa.com/blog/index.html">Blog</a>
          <a className="button button-small" href="https://aisaaswithmustafa.com/#contact">
            Start a project
          </a>
        </nav>
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link href="/services/">Services</Link>
            <a href="https://aisaaswithmustafa.com/portfolio.html">Work</a>
            <a href="https://aisaaswithmustafa.com/blog/index.html">Blog</a>
            <a href="https://aisaaswithmustafa.com/#contact">Start a project</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
