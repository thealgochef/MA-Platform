"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

interface Message {
  id: string;
  content: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  sender_id: string;
  created_at: string;
  users: { full_name: string } | null;
}

interface ThreadData {
  engagement: {
    id: string;
    engagement_id: string;
    deal_id: string;
    stage: string;
    headline: string;
  };
  otherParty: {
    full_name: string;
    firms: { name: string };
  } | null;
  messages: Message[];
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch thread data
  useEffect(() => {
    const fetchThread = async () => {
      const res = await fetch(`/api/messages/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setThread(data);
        setMessages(data.messages);
      }
      setLoading(false);
    };
    fetchThread();
  }, [threadId]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `engagement_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !attachment) return;
    setSending(true);

    try {
      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;

      // Upload attachment if present
      if (attachment) {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const filePath = `${threadId}/${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(filePath, attachment);

        if (!uploadError) {
          attachmentPath = filePath;
          attachmentName = attachment.name;
        }
      }

      const res = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim() || null,
          attachment_path: attachmentPath,
          attachment_name: attachmentName,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        setAttachment(null);
        // Message will appear via realtime subscription
      }
    } catch {
      // Silently handle errors
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading || !thread) {
    return (
      <main className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading thread...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt flex flex-col">
      {/* Deal context header */}
      <div className="bg-surface-alt border-b border-border-gray px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              {thread.otherParty?.full_name || "Unknown"}
            </h1>
            <p className="text-xs text-text-secondary">
              {thread.otherParty?.firms?.name || ""}
            </p>
          </div>
          <div className="text-right">
            <a
              href={`/deals/${thread.engagement.deal_id}`}
              className="text-sm text-secondary hover:underline"
            >
              {thread.engagement.headline}
            </a>
            <p className="text-xs text-text-secondary">
              Stage: {thread.engagement.stage}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-text-secondary text-sm py-8">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-primary">
                    {msg.users?.full_name || "Unknown"}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                {msg.content && (
                  <p className="text-sm text-text mt-1">{msg.content}</p>
                )}
                {msg.attachment_path && (
                  <div className="mt-1">
                    <a
                      href={`/api/messages/${threadId}/attachment?path=${encodeURIComponent(msg.attachment_path)}`}
                      className="inline-flex items-center gap-1 text-xs text-secondary hover:underline bg-bg-alt rounded px-2 py-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {msg.attachment_name || "Attachment"}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="bg-surface-alt border-t border-border-gray px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full border border-border-gray rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none"
            />
            {attachment && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-secondary">{attachment.name}</span>
                <button
                  onClick={() => setAttachment(null)}
                  className="text-xs text-error hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* PDF attachment button */}
          <label className="cursor-pointer px-3 py-2 bg-bg-alt text-sm border border-border-gray rounded-md text-text-secondary hover:bg-btn-hover-gray transition-colors">
            PDF
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.type === "application/pdf" && file.size <= 50 * 1024 * 1024) {
                  setAttachment(file);
                }
              }}
            />
          </label>

          <button
            onClick={handleSend}
            disabled={sending || (!newMessage.trim() && !attachment)}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
