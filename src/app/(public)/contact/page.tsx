import Link from "next/link";

export default function ContactPage() {
  const navLinkClass = "text-sm font-medium text-secondary transition-colors hover:text-primary";
  const footerLinkClass = "font-medium text-secondary transition-colors hover:text-primary";

  return (
    <main className="min-h-screen pt-24 bg-bg text-text">

      {/* Navigation */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 animate-fade-in"
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(45, 106, 79, 0.1)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <Link href="/" className="font-display text-xl font-bold">
            Geneva Holdings
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/for-buyers" className={navLinkClass}>
              For Buyers
            </Link>
            <Link href="/for-brokers" className={navLinkClass}>
              For Brokers
            </Link>
            <Link href="/about" className={navLinkClass}>
              About
            </Link>
            <Link href="/how-it-works" className={navLinkClass}>
              How It Works
            </Link>

            <Link href="/login" className="btn-primary rounded px-4 py-2 text-xs font-bold tracking-widest transition-all">
              Sign Up / Log In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-display font-bold text-primary mb-6">Contact Us</h1>
          <p className="text-text mb-8">
            Have questions about Geneva Holdings? We would love to hear from you.
          </p>
          <div className="bg-surface rounded-lg p-6">
            <p className="text-sm text-text-secondary">
              Contact information will be available when the platform launches publicly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="bg-bg py-6"
        style={{ borderTop: "1px solid rgba(201, 168, 108, 0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <p className="font-display text-lg font-bold">Geneva Holdings</p>
              <p className="mt-1 text-sm text-secondary">Professional M&A Marketplace</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className={footerLinkClass}>About</Link>
              <Link href="/contact" className={footerLinkClass}>Contact</Link>
              <Link href="/terms" className={footerLinkClass}>Terms of Service</Link>
              <Link href="/privacy" className={footerLinkClass}>Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
