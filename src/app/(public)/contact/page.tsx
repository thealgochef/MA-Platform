import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">Geneva Holdings</Link>
          <Link href="/login" className="bg-white text-navy px-4 py-2 rounded-md text-sm font-medium hover:bg-light-gray transition-colors">
            Sign Up / Log In
          </Link>
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
