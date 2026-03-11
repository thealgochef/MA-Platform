import Link from "next/link";

export default function ForBuyersPage() {
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
          <h1 className="text-4xl font-bold text-navy mb-6">For Buyers</h1>
          <p className="text-lg text-text-secondary mb-8">
            Access quality deal flow from vetted brokers and bankers across the middle market.
            Geneva Holdings gives every buyer — from PE firms to search funds — a level playing field.
          </p>

          <div className="bg-light-gray rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-navy mb-4">1.25% Flat Success Fee</h2>
            <p className="text-text-secondary mb-4">
              Unlike the traditional Lehman formula where fees can reach 5% or more on smaller deals,
              Geneva Holdings charges a simple, flat 1.25% success fee on total enterprise value —
              paid only when a deal closes.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-white rounded-md p-4">
                <p className="text-sm font-medium text-text-primary mb-1">Traditional Lehman Formula</p>
                <p className="text-sm text-text-secondary">5% of first $1M, 4% of second $1M, etc. Complex and expensive.</p>
              </div>
              <div className="bg-white rounded-md p-4 border-2 border-slate-blue">
                <p className="text-sm font-medium text-navy mb-1">Geneva Holdings</p>
                <p className="text-sm text-text-secondary">Flat 1.25% on total enterprise value. Simple, transparent, fair.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-navy mb-4">How It Works for Buyers</h2>
          <ol className="space-y-4 mb-8">
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-text-primary">Create your buyer profile</p>
                <p className="text-sm text-text-secondary">Tell us about your firm, investment criteria, and acquisition strategy.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-text-primary">Set up acquisition projects</p>
                <p className="text-sm text-text-secondary">Define your criteria — industry, size, geography — and get matched with relevant deals.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-text-primary">Pursue deals seamlessly</p>
                <p className="text-sm text-text-secondary">Sign NDAs, review CIMs, submit IOIs and LOIs — all within the platform.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-text-primary">Close with confidence</p>
                <p className="text-sm text-text-secondary">Pay just 1.25% on close. No upfront fees, no subscriptions.</p>
              </div>
            </li>
          </ol>

          <Link
            href="/login"
            className="inline-block bg-navy text-white px-8 py-3 rounded-md font-medium hover:bg-slate-blue transition-colors"
          >
            Get Started as a Buyer
          </Link>
        </div>
      </section>
    </main>
  );
}
