import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-light-gray">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-lg text-center">
        <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-info"
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
        <h1 className="text-2xl font-bold text-navy mb-4">
          Application Received
        </h1>
        <p className="text-text-secondary mb-6">
          Thank you for applying. Our team reviews all applications and
          you&apos;ll hear back within 24 hours.
        </p>
        <p className="text-text-secondary text-sm mb-8">
          We&apos;ll send you an email once your application has been reviewed.
        </p>
        <Link
          href="/"
          className="text-slate-blue hover:text-navy font-medium text-sm"
        >
          Return to homepage
        </Link>
      </div>
    </main>
  );
}
