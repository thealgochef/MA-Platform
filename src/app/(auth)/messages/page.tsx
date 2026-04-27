"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Thread {
  engagementId: string;
  dealId: string;
  stage: string;
  headline: string;
  otherParty: {
    full_name: string;
    firms: { name: string };
  } | null;
  firm: { name: string } | null;
  lastMessage: {
    content: string | null;
    created_at: string;
    sender_id: string;
  } | null;
  unread: boolean;
}

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads);
      }
      setLoading(false);
    };
    fetchThreads();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading messages...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-primary mb-6">Messages</h1>

        {threads.length === 0 ? (
          <div className="bg-surface-alt rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary">No message threads yet.</p>
            <p className="text-sm text-text-secondary mt-2">
              Threads are created when you engage with a deal.
            </p>
          </div>
        ) : (
          <div className="bg-surface-alt rounded-lg shadow-md divide-y divide-border-color">
            {threads.map((thread) => (
              <Link
                key={thread.engagementId}
                href={`/messages/${thread.engagementId}`}
                className="block hover:bg-bg-alt transition-colors"
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Unread indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    thread.unread ? "bg-secondary" : "bg-transparent"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${thread.unread ? "font-semibold text-primary" : "font-medium text-text"}`}>
                          {thread.otherParty?.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {thread.otherParty?.firms?.name || thread.firm?.name || ""}
                        </span>
                      </div>
                      {thread.lastMessage && (
                        <span className="text-xs text-text-secondary flex-shrink-0">
                          {new Date(thread.lastMessage.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {thread.headline}
                    </p>
                    {thread.lastMessage && (
                      <p className={`text-sm truncate mt-1 ${
                        thread.unread ? "text-text" : "text-text-secondary"
                      }`}>
                        {thread.lastMessage.content || "[Attachment]"}
                      </p>
                    )}
                  </div>

                  <span className="text-xs px-2 py-0.5 rounded-full bg-bg-alt text-text-secondary flex-shrink-0">
                    {thread.stage}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
