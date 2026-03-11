import Link from "next/link";

export default function AboutPage() {
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
          <h1 className="text-4xl font-bold text-navy mb-6">About Geneva Holdings</h1>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-navy mb-3">Our Mission</h2>
              <p className="text-text-secondary leading-relaxed">
                Geneva Holdings was founded with a clear mission: to create a more transparent,
                efficient, and fair marketplace for middle market M&A transactions. We believe
                that the best deals happen when quality participants are connected through a
                trusted platform with aligned incentives.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy mb-3">Our Values</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Confidentiality</h3>
                  <p className="text-sm text-text-secondary">
                    Every interaction on our platform is protected by NDAs and strict access controls.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Transparency</h3>
                  <p className="text-sm text-text-secondary">
                    Simple, flat fees with no hidden costs. You always know what you are paying.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Quality</h3>
                  <p className="text-sm text-text-secondary">
                    Every participant is vetted and approved before accessing the platform.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy mb-3">Our Story</h2>
              <p className="text-text-secondary leading-relaxed">
                Geneva Holdings was created by professionals who experienced firsthand the
                inefficiencies of the traditional M&A process in the middle market. We saw
                an opportunity to build a platform that combines the best of technology with
                the rigor and confidentiality that M&A transactions demand.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
