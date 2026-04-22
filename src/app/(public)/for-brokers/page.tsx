import Link from "next/link";

export default function ForBrokersPage() {
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
          <h1 className="text-4xl font-display font-bold text-primary mb-6">For Brokers</h1>
          <p className="text-lg text-text mb-8">
            Reach a curated network of vetted buyers. Post deals for free and earn
            an incentive on every successful close.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-display font-bold text-primary mb-3">Free to Post</h3>
              <p className="text-sm text-text">
                Unlike platforms like BizBuySell that charge listing fees,
                Geneva Holdings lets you post deals completely free.
                No subscriptions, no per-listing charges.
              </p>
            </div>
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-display font-bold text-primary mb-3">0.25% Broker Incentive</h3>
              <p className="text-sm text-text">
                Unlike platforms like Axial that take fees without giving back,
                Geneva Holdings pays you a 0.25% incentive on total enterprise value
                for every deal that closes through our platform.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-primary mb-4">How It Works for Brokers</h2>
          <ol className="space-y-4 mb-8">
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-primary">Create your broker profile</p>
                <p className="text-sm text-text-secondary">Sign up with your firm details, credentials, and industry focus.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-primary">Post your deals</p>
                <p className="text-sm text-text-secondary">Create listings with teasers, set NDA preferences, and upload CIMs. Publish when ready.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-primary">Manage your pipeline</p>
                <p className="text-sm text-text-secondary">Track buyer engagement, review IOIs and LOIs side-by-side, and communicate securely.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-primary">Close and earn</p>
                <p className="text-sm text-text-secondary">When a deal closes, earn a 0.25% broker incentive in addition to your advisory fees.</p>
              </div>
            </li>
          </ol>

          <Link
            href="/login" className="inline-block btn-primary px-8 py-3 rounded-md font-medium transition-colors">
            Get Started as a Broker
          </Link>
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
