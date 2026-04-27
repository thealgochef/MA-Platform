import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface text-text">
      <div className="bg-bg rounded-xl shadow-md p-8 w-full max-w-lg text-center">

        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold font-display text-primary mb-4">
          Application Received
        </h1>

        <p className="mb-6">
          All prospective buyers are carefully reviewed to maintain deal confidentiality and the integrity of our network. You can expect a decision within 24 hours.
        </p>
        <p className="text-sm mb-8">
          We&apos;ll send you an email once a decision has been made.
        </p>

        <Link
          href="/"
          className="text-md font-medium text-primary hover:text-secondary"
        >
          Return to homepage
        </Link>

      </div>
    </main>
  );
}
