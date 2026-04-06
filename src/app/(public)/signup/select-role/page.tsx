"use client";

import { useRouter } from "next/navigation";

export default function SelectRolePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-light-gray">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy mb-2">
            Welcome to Geneva Holdings
          </h1>
          <p className="text-text-secondary">
            What is your main objective?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/signup/broker")}
            className="w-full text-left p-4 border border-border-gray rounded-lg hover:border-navy hover:bg-navy/5 transition-colors group"
          >
            <h3 className="text-lg font-semibold text-navy group-hover:text-slate-blue">
              Sell a Business
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              List confidentially. Reach serious, vetted buyers. Close faster.
            </p>
          </button>

          <button
            onClick={() => router.push("/signup/buyer")}
            className="w-full text-left p-4 border border-border-gray rounded-lg hover:border-navy hover:bg-navy/5 transition-colors group"
          >
            <h3 className="text-lg font-semibold text-navy group-hover:text-slate-blue">
              Buy a Business
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Set your criteria and get matched to live deals.
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
