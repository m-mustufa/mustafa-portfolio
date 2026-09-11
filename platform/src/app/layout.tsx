import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

const siteUrl = "https://aisaaswithmustafa.com";
const themeBootScript = `
  try {
    const choice = localStorage.getItem("mustafa-theme") || "system";
    const resolved = choice === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : choice;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeChoice = choice;
  } catch (_) {}
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SaaS & AI Development Services | Muhammad Mustafa",
    template: "%s | Muhammad Mustafa",
  },
  description:
    "Hire Muhammad Mustafa for production SaaS, AI, React, Next.js, Node.js and Angular development in the UAE and remotely.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Muhammad Mustafa — SaaS & AI Engineer",
    images: [
      {
        url: "/assets/img/mustafa-full-stack-saas-engineer-angular-nodejs.jpg",
        width: 1200,
        height: 630,
        alt: "Muhammad Mustafa, full-stack SaaS and AI engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body>
        <Header />
        {children}
        <footer>
          <div className="shell footer-inner">
            <p>© 2026 Muhammad Mustafa.</p>
            <a href="https://aisaaswithmustafa.com/#contact">Discuss your project</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
