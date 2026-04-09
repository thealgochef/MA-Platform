import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Geneva Holdings
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/for-buyers" className="text-sm hover:text-white/80 transition-colors">
              For Buyers
            </Link>
            <Link href="/for-brokers" className="text-sm hover:text-white/80 transition-colors">
              For Brokers
            </Link>
            <Link href="/about" className="text-sm hover:text-white/80 transition-colors">
              About
            </Link>
            <Link href="/how-it-works" className="text-sm hover:text-white/80 transition-colors">
              How It Works
            </Link>
            <Link
              href="/login"
              className="bg-white text-navy px-4 py-2 rounded-md text-sm font-medium hover:bg-light-gray transition-colors"
            >
              Sign Up / Log In
            </Link>
          </div>
        </div>
      </nav>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy mb-6">Terms of Service</h1>
          <p className="text-text-secondary mb-8">
            Last updated: March 2026
          </p>
          <div className="prose prose-sm text-text-secondary space-y-4">
            <p>
              These Terms of Service govern your use of the Geneva Holdings platform.
              By accessing or using our services, you agree to be bound by these terms.
            </p>
            <p>
              This is a placeholder page. Full terms of service will be published before the platform launches publicly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
