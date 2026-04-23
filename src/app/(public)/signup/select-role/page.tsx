"use client";

import { useRouter } from "next/navigation";

export default function SelectRolePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface text-text">
      <div className="bg-bg rounded-xl shadow-md p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display text-primary mb-2">
            Welcome to Geneva Holdings
          </h1>
          <p className="">
            What is your main objective?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/signup/broker")}
            className="w-full text-left p-4 border border-border-color rounded-lg hover:border-primary hover:bg-faint transition-colors group"
          >
            <h3 className="text-lg font-semibold text-primary group-hover:text-primary">
              Sell a Business
            </h3>
            <p className="text-sm mt-1">
              List confidentially. Reach serious, vetted buyers. Close faster.
            </p>
          </button>

          <button
            onClick={() => router.push("/signup/buyer")}
            className="w-full text-left p-4 border border-border-color rounded-lg hover:border-primary hover:bg-faint transition-colors group"
          >
            <h3 className="text-lg font-semibold text-primary group-hover:text-primary">
              Buy a Business
            </h3>
            <p className="text-sm mt-1">
              Set your criteria and get matched to live deals.
            </p>
          </button>
        </div>

      </div>
    </main>
  );
}
