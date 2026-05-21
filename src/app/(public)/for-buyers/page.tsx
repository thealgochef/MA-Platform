import Link from "next/link";
import FeeStructureTable from "@/components/buyer/FeeStructureTable";

export default function ForBuyersPage() {
  const navLinkClass = "text-sm font-medium text-secondary transition-colors hover:text-primary";
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
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-display font-bold text-primary mb-6">For Buyers</h1>
          <p className="text-lg mb-8">
            Access quality deal flow from vetted brokers and bankers across the middle market.
            Geneva Holdings gives every buyer — from PE firms to search funds — a level playing field.
          </p>

          <div className="bg-surface rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-display font-bold text-primary mb-4">1.25% Flat Success Fee</h2>
            <p className="mb-4">
              Unlike the traditional Lehman formula where fees can reach 5% or more on smaller deals,
              Geneva Holdings charges a simple, flat 1.25% success fee on total enterprise value —
              paid only when a deal closes.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-bg rounded-md p-4 border border-border-color">
                <p className="text-sm font-medium text-primary mb-1">Traditional Lehman Formula</p>
                <p className="text-sm">5% of first $1M, 4% of second $1M, etc. Complex and expensive.</p>
              </div>
              <div className="bg-bg rounded-md p-4 border-2 border-primary">
                <p className="text-sm font-medium text-primary mb-1">Geneva Holdings</p>
                <p className="text-sm">Flat 1.25% on total enterprise value. Simple, transparent, fair.</p>
              </div>
            </div>
            <FeeStructureTable />
          </div>

          <h2 className="text-2xl font-display font-bold text-primary mb-4">How It Works for Buyers</h2>
          <ol className="space-y-4 mb-8">
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-primary">Create your buyer profile</p>
                <p className="text-sm">Tell us about your firm, investment criteria, and acquisition strategy.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-primary">Set up acquisition projects</p>
                <p className="text-sm">Define your criteria — industry, size, geography — and get matched with relevant deals.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-primary">Pursue deals seamlessly</p>
                <p className="text-sm">Sign NDAs, review CIMs, submit IOIs and LOIs — all within the platform.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-primary text-bg rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-primary">Close with confidence</p>
                <p className="text-sm">Pay just 1.25% on close. No upfront fees, no subscriptions.</p>
              </div>
            </li>
          </ol>

          <Link
            href="/login"
            className="inline-block btn-primary px-8 py-3 rounded-md font-medium transition-colors"
          >
            Get Started as a Buyer
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
