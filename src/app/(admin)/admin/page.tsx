"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  location: string;
  buyer_type: string | null;
  license_credentials: string | null;
  industry_focus: string[];
  created_at: string;
  firm_id: string | null;
  firms: { name: string; website: string; team_members_requested: string | null } | null;
}

interface InvitationResult {
  email: string;
  link: string | null;
  error: string | null;
}

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationResults, setInvitationResults] = useState<Record<string, InvitationResult[]>>({});
  const [sendingInvites, setSendingInvites] = useState<Record<string, boolean>>({});

  const fetchPending = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("*, firms(name, website, team_members_requested)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setPendingUsers((data as PendingUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (
    userId: string,
    action: "approve" | "reject"
  ) => {
    const res = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });

    if (res.ok) {
      fetchPending();
    }
  };

  const parseTeamMembers = (text: string): { name: string; email: string }[] => {
    const members: { name: string; email: string }[] = [];
    const lines = text.split("\n").filter((l) => l.trim());
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;

    for (const line of lines) {
      const emailMatch = line.match(emailRegex);
      if (emailMatch) {
        const email = emailMatch[0];
        const name = line.replace(email, "").replace(/[,\-—|]/g, "").trim() || email;
        members.push({ name, email });
      }
    }
    return members;
  };

  const handleSendInvitations = async (user: PendingUser) => {
    if (!user.firms?.team_members_requested || !user.firm_id) return;

    const members = parseTeamMembers(user.firms.team_members_requested);
    if (members.length === 0) return;

    setSendingInvites((prev) => ({ ...prev, [user.id]: true }));
    const results: InvitationResult[] = [];

    for (const member of members) {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email,
          firmId: user.firm_id,
          role: user.role,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ email: member.email, link: data.invitationLink, error: null });
      } else {
        const data = await res.json();
        results.push({ email: member.email, link: null, error: data.error || "Failed" });
      }
    }

    setInvitationResults((prev) => ({ ...prev, [user.id]: results }));
    setSendingInvites((prev) => ({ ...prev, [user.id]: false }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-light-gray p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-navy mb-8">
            Admin — Pending Applications
          </h1>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-light-gray p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-navy mb-8">
          Admin — Pending Applications
        </h1>

        {pendingUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary">
              No pending applications at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-navy">
                      {user.full_name}
                    </h3>
                    <p className="text-sm text-text-secondary">{user.email}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-1 bg-info/10 text-info rounded text-xs font-medium">
                        {user.role}
                      </span>
                      {user.firms && (
                        <span className="px-2 py-1 bg-light-gray text-text-secondary rounded text-xs">
                          {user.firms.name}
                        </span>
                      )}
                      {user.buyer_type && (
                        <span className="px-2 py-1 bg-light-gray text-text-secondary rounded text-xs">
                          {user.buyer_type}
                        </span>
                      )}
                    </div>
                    {user.location && (
                      <p className="text-sm text-text-secondary mt-1">
                        {user.location}
                      </p>
                    )}
                    {user.industry_focus.length > 0 && (
                      <p className="text-xs text-text-secondary mt-1">
                        Industries: {user.industry_focus.join(", ")}
                      </p>
                    )}

                    {user.firms?.team_members_requested && (
                      <div className="mt-3 p-3 bg-light-gray rounded-md">
                        <p className="text-xs font-medium text-text-primary mb-1">
                          Requested Team Members:
                        </p>
                        <p className="text-xs text-text-secondary whitespace-pre-line">
                          {user.firms.team_members_requested}
                        </p>
                        <button
                          onClick={() => handleSendInvitations(user)}
                          disabled={sendingInvites[user.id]}
                          className="mt-2 px-3 py-1 bg-slate-blue text-white rounded text-xs font-medium hover:bg-navy transition-colors disabled:opacity-50"
                        >
                          {sendingInvites[user.id] ? "Sending..." : "Generate Invitation Links"}
                        </button>
                        {invitationResults[user.id] && (
                          <div className="mt-2 space-y-1">
                            {invitationResults[user.id].map((result, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{result.email}:</span>{" "}
                                {result.link ? (
                                  <span className="text-success break-all">{result.link}</span>
                                ) : (
                                  <span className="text-error">{result.error}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAction(user.id, "approve")}
                      className="px-4 py-2 bg-success text-white rounded-md text-sm font-medium hover:bg-success/90 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(user.id, "reject")}
                      className="px-4 py-2 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
