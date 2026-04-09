import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Navigation */}
      <nav className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
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
            <Link href="/login" className="bg-white text-navy px-4 py-2 rounded-md text-sm font-medium hover:bg-light-gray transition-colors">
              Sign Up / Log In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy mb-6">How It Works</h1>
          <p className="text-lg text-text-secondary mb-12">
            From sign-up to deal close, here is the Geneva Holdings process.
          </p>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">Create your profile</h3>
                <p className="text-text-secondary">
                  Sign up as a buyer or broker using Google authentication. Fill out your
                  firm details, investment criteria, and professional background.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">Sign the membership agreement</h3>
                <p className="text-text-secondary">
                  Review and sign the platform membership agreement as part of your
                  onboarding process. This ensures all participants adhere to our
                  standards of conduct.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">Profile reviewed and approved</h3>
                <p className="text-text-secondary">
                  Our team reviews every application within 24 hours. We verify
                  credentials and ensure quality on both sides of the marketplace.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">Buyers create projects; brokers post deals</h3>
                <p className="text-text-secondary">
                  Buyers define their acquisition criteria and get matched with relevant deals.
                  Brokers create deal listings with teasers and set their NDA preferences.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">Buyers matched to deals, browse and pursue</h3>
                <p className="text-text-secondary">
                  Our matching algorithm connects buyers with relevant opportunities.
                  Buyers can also browse all active deals and filter by industry, size, and location.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="bg-navy text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
                6
              </div>
              <div>
                <h3 className="text-xl font-semibold text-navy mb-2">NDA signed, CIM reviewed, offers submitted</h3>
                <p className="text-text-secondary">
                  Everything happens in-platform: electronic NDA signing, confidential CIM access,
                  IOI and LOI submission, secure messaging, and deal closure tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/login"
              className="inline-block bg-navy text-white px-8 py-3 rounded-md font-medium hover:bg-slate-blue transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <p className="font-bold text-lg">Geneva Holdings</p>
              <p className="text-sm text-white/60 mt-1">Professional M&A Marketplace</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="hover:text-white/80 transition-colors">About</Link>
              <Link href="/contact" className="hover:text-white/80 transition-colors">Contact</Link>
              <Link href="/terms" className="hover:text-white/80 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
