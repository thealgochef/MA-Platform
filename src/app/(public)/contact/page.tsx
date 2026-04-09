import Link from "next/link";

export default function ContactPage() {
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
          <h1 className="text-4xl font-bold text-navy mb-6">Contact Us</h1>
          <p className="text-text-secondary mb-8">
            Have questions about Geneva Holdings? We would love to hear from you.
          </p>
          <div className="bg-light-gray rounded-lg p-6">
            <p className="text-sm text-text-secondary">
              Contact information will be available when the platform launches publicly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
