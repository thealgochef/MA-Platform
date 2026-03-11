import Link from "next/link";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-navy mb-6">Privacy Policy</h1>
          <p className="text-text-secondary mb-8">
            Last updated: March 2026
          </p>
          <div className="prose prose-sm text-text-secondary space-y-4">
            <p>
              Geneva Holdings is committed to protecting your privacy. This policy describes
              how we collect, use, and protect your personal information.
            </p>
            <p>
              This is a placeholder page. The full privacy policy will be published before the platform launches publicly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
