import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg">

      {/* Navigation */}
      <nav className="bg-navy text-text">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-display font-bold">
            Geneva Holdings
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/for-buyers" className="text-secondary hover:text-primary transition-colors">
              For Buyers
            </Link>
            <Link href="/for-brokers" className="text-secondary hover:text-primary transition-colors">
              For Brokers
            </Link>
            <Link href="/about" className="text-secondary hover:text-primary transition-colors">
              About
            </Link>
            <Link href="/how-it-works" className="text-secondary hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="/login" className="bg-primary text-bg px-4 py-2 rounded-md text-sm font-medium hover:bg-light-gray transition-colors">
              Sign Up / Log In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-navy text-text py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-text text-5xl font-display font-bold mb-6">
            The Professional M&A Marketplace for the Middle Market
          </h1>
          <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
            Geneva Holdings connects vetted brokers and bankers with qualified buyers
            for confidential, efficient deal execution.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="bg-primary text-bg px-8 py-3 rounded-md font-medium hover:bg-light-gray transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/how-it-works"
              className="border border-secondary text-text px-8 py-3 rounded-md font-medium hover:bg-bg/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-bg rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-display font-semibold text-primary mb-3">Vetted Participants</h3>
              <p className="text-sm text-text-secondary">
                Every broker and buyer is reviewed and approved before accessing the platform,
                ensuring quality and confidentiality.
              </p>
            </div>
            <div className="bg-bg rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-display font-semibold text-primary mb-3">Simple, Transparent Fees</h3>
              <p className="text-sm text-text-secondary">
                1.25% flat success fee for buyers. No subscription fees, no hidden costs.
                Brokers earn a 0.25% incentive on every closed deal.
              </p>
            </div>
            <div className="bg-bg rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-display font-semibold text-primary mb-3">End-to-End Platform</h3>
              <p className="text-sm text-text-secondary">
                From deal discovery to NDA signing, CIM review, IOI/LOI submission,
                and deal closure — all managed in one secure platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold text-primary mb-8">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-lg font-display font-semibold text-primary mb-2">For Buyers</h3>
              <p className="text-sm text-text-secondary">
                Create acquisition criteria projects, get matched with relevant deals,
                and manage the entire pursuit process from NDA to close.
              </p>
              <Link href="/for-buyers" className="text-sm text-slate-blue hover:underline mt-3 inline-block">
                Learn more
              </Link>
            </div>
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-lg font-display font-semibold text-primary mb-2">For Brokers</h3>
              <p className="text-sm text-text-secondary">
                Post deals for free, reach vetted buyers, manage your pipeline,
                and earn an incentive on every successful close.
              </p>
              <Link href="/for-brokers" className="text-sm text-slate-blue hover:underline mt-3 inline-block">
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-text py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <p className="font-display font-bold text-lg">Geneva Holdings</p>
              <p className="text-sm text-secondary mt-1">Professional M&A Marketplace</p>
            </div>
            <div className="flex gap-6 text-sm font-medium">
              <Link href="/about" className="text-secondary hover:text-primary transition-colors">About</Link>
              <Link href="/contact" className="text-secondary hover:text-primary transition-colors">Contact</Link>
              <Link href="/terms" className="text-secondary hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-secondary hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
