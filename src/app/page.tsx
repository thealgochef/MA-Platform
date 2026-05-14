import Link from "next/link";

export default function HomePage() {
  const navLinkClass = "text-sm font-medium text-secondary transition-colors hover:text-primary";
  const valuePropCardClass = "rounded-lg bg-surface p-6 shadow-md";
  const valuePropTitleClass = "mb-3 font-display text-xl font-semibold text-primary";
  const howItWorksCardClass = "flex h-full flex-col rounded-lg border border-border-color bg-bg p-6";
  const footerLinkClass = "font-medium text-secondary transition-colors hover:text-primary";

  return (
    <main className="min-h-screen pt-24 bg-bg text-text">

      {/* Navigation */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 animate-fade-in"
        style={{
          background: "rgba(var(--color-bg-rgb), 0.95)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)", // for Safari support
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
      <section className="bg-hero-pattern py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 id="hero-headline" className="mb-8 font-display text-4xl font-medium leading-tight sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up delay-2">
            Where Strategic <br /><span className="gradient-text">Transactions</span> Begin
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl animate-fade-in-up delay-3">
            An exclusive platform connecting principals, investors, and advisors across the North American lower middle market.
          </p>
          <div className="flex justify-center gap-4 animate-fade-in-up delay-4">
            <Link href="/login" className="btn-primary rounded px-8 py-3 text-sm font-bold tracking-widest transition-all">
              Request Access
            </Link>
            <Link href="/how-it-works" className="rounded border-2 border-border-color bg-bg px-8 py-3 text-sm font-bold text-secondary transition-colors hover:bg-faint hover:text-primary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16"> {/* add accent-colored background here */}
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className={valuePropCardClass}>
              <h3 className={valuePropTitleClass}>Vetted Participants</h3>
              <p className="text-sm">
                Every broker and buyer is reviewed and approved before accessing the platform,
                ensuring quality and confidentiality.
              </p>
            </div>
            <div className={valuePropCardClass}>
              <h3 className={valuePropTitleClass}>Simple, Transparent Fees</h3>
              <p className="text-sm">
                1.25% flat success fee for buyers. No subscription fees, no hidden costs.
                Brokers earn a 0.25% incentive on every closed deal.
              </p>
            </div>
            <div className={valuePropCardClass}>
              <h3 className={valuePropTitleClass}>End-to-End Platform</h3>
              <p className="text-sm">
                From deal discovery to NDA signing, CIM review, IOI/LOI submission,
                and deal closure — all managed in one secure platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-8 font-display text-3xl font-bold text-primary">How It Works</h2>
          <div className="grid gap-6 text-left md:grid-cols-2">
            <div className={howItWorksCardClass}>
              <h3 className="mb-2 font-display text-xl font-semibold text-primary">For Buyers</h3>
              <p className="text-sm">
                Create acquisition criteria projects, get matched with relevant deals,
                and manage the entire pursuit process from NDA to close.
              </p>
              <Link href="/for-buyers" className="mt-auto inline-block pt-3 text-sm text-secondary hover:text-primary hover:underline">
                Learn more
              </Link>
            </div>
            <div className={howItWorksCardClass}>
              <h3 className="mb-2 font-display text-xl font-semibold text-primary">For Brokers</h3>
              <p className="text-sm">
                Post deals for free, reach vetted buyers, manage your pipeline,
                and earn an incentive on every successful close.
              </p>
              <Link href="/for-brokers" className="mt-auto inline-block pt-3 text-sm text-secondary hover:text-primary hover:underline">
                Learn more
              </Link>
            </div>
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
