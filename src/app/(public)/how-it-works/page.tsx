import Link from "next/link";

export default function HowItWorksPage() {
  const navLinkClass = "text-sm font-medium text-secondary transition-colors hover:text-primary";
  const footerLinkClass = "font-medium text-secondary transition-colors hover:text-primary";

  return (
    <main className="min-h-screen pt-24 bg-bg text-text">

      {/* Navigation */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 animate-fade-in"
        style={{
          background: "var(--color-background)",
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
          <h1 className="text-4xl font-display font-bold text-primary mb-6">How It Works</h1>
          <p className="text-lg mb-12">
            From sign-up to deal close, here is the Geneva Holdings process.
          </p>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">Create your profile</h3>
                <p className="">
                  Sign up as a buyer or broker using Google authentication. Fill out your
                  firm details, investment criteria, and professional background.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">Sign the membership agreement</h3>
                <p className="">
                  Review and sign the platform membership agreement as part of your
                  onboarding process. This ensures all participants adhere to our
                  standards of conduct.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">Profile reviewed and approved</h3>
                <p className="">
                  Our team reviews every application within 24 hours. We verify
                  credentials and ensure quality on both sides of the marketplace.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">Buyers create projects; brokers post deals</h3>
                <p className="">
                  Buyers define their acquisition criteria and get matched with relevant deals.
                  Brokers create deal listings with teasers and set their NDA preferences.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">Buyers matched to deals, browse and pursue</h3>
                <p className="">
                  Our matching algorithm connects buyers with relevant opportunities.
                  Buyers can also browse all active deals and filter by industry, size, and location.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-primary text-bg rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                6
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold text-primary mb-2">NDA signed, CIM reviewed, offers submitted</h3>
                <p className="">
                  Everything happens in-platform: electronic NDA signing, confidential CIM access,
                  IOI and LOI submission, secure messaging, and deal closure tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/login"
              className="inline-block btn-primary px-8 py-3 rounded-md font-medium transition-colors"
            >
              Get Started
            </Link>
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
