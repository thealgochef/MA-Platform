"use client";

import { useState } from "react";
import Link from "next/link";

export default function SharedDealPage() {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API endpoint
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-surface py-12 text-text">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-bg rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-display font-bold text-primary mb-4">
            Someone has shared a deal with you on Geneva Holdings
          </h1>
          <div className="mb-8">
            <h2 className="text-lg font-display font-semibold text-primary mb-2">
              About the Platform
            </h2>
            <p className="text-sm">
              Geneva Holdings is a professional, confidential M&amp;A
              marketplace for the middle market. We connect vetted brokers with
              qualified buyers for seamless deal execution.
            </p>
          </div>
          <div className="mb-8">
            <h2 className="text-lg font-display font-semibold text-primary mb-2">
              How It Works
            </h2>
            <ol className="text-sm text-left space-y-2 max-w-sm mx-auto">
              <li>1. Create your profile</li>
              <li>2. Sign the membership agreement</li>
              <li>3. Profile reviewed and approved</li>
              <li>4. Browse and pursue deals</li>
            </ol>
          </div>
          <Link
            href="/login"
            className="inline-block bg-primary text-white rounded-md py-3 px-8 font-medium hover:bg-btn-hover transition-colors mb-8"
          >
            Sign Up to View This Deal
          </Link>

          <div className="border-t pt-8">
            <h2 className="text-lg font-display font-semibold text-primary mb-4">
              Have Questions? Get in Touch
            </h2>
            {submitted ? (
              <p className="text-green-600 font-medium">
                Thank you for your message. We will be in touch shortly.
              </p>
            ) : (
              <form onSubmit={handleContactSubmit} className="text-left space-y-4 max-w-md mx-auto">
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="contactMessage" className="block text-sm font-medium mb-1">
                    Message
                  </label>
                  <textarea
                    id="contactMessage"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    className="w-full border border-subtle rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white rounded-md py-2 font-medium hover:bg-btn-hover transition-colors"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
