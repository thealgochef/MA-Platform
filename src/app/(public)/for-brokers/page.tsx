import Link from "next/link";

export default function ForBrokersPage() {
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
          <h1 className="text-4xl font-bold text-navy mb-6">For Brokers</h1>
          <p className="text-lg text-text-secondary mb-8">
            Reach a curated network of vetted buyers. Post deals for free and earn
            an incentive on every successful close.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-light-gray rounded-lg p-6">
              <h3 className="text-xl font-bold text-navy mb-3">Free to Post</h3>
              <p className="text-sm text-text-secondary">
                Unlike platforms like BizBuySell that charge listing fees,
                Geneva Holdings lets you post deals completely free.
                No subscriptions, no per-listing charges.
              </p>
            </div>
            <div className="bg-light-gray rounded-lg p-6">
              <h3 className="text-xl font-bold text-navy mb-3">0.25% Broker Incentive</h3>
              <p className="text-sm text-text-secondary">
                Unlike platforms like Axial that take fees without giving back,
                Geneva Holdings pays you a 0.25% incentive on total enterprise value
                for every deal that closes through our platform.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-navy mb-4">How It Works for Brokers</h2>
          <ol className="space-y-4 mb-8">
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-text-primary">Create your broker profile</p>
                <p className="text-sm text-text-secondary">Sign up with your firm details, credentials, and industry focus.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-text-primary">Post your deals</p>
                <p className="text-sm text-text-secondary">Create listings with teasers, set NDA preferences, and upload CIMs. Publish when ready.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-text-primary">Manage your pipeline</p>
                <p className="text-sm text-text-secondary">Track buyer engagement, review IOIs and LOIs side-by-side, and communicate securely.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-text-primary">Close and earn</p>
                <p className="text-sm text-text-secondary">When a deal closes, earn a 0.25% broker incentive in addition to your advisory fees.</p>
              </div>
            </li>
          </ol>

          <Link
            href="/login" className="inline-block bg-navy text-white px-8 py-3 rounded-md font-medium hover:bg-slate-blue transition-colors">
            Get Started as a Broker
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-8">
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
