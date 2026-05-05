"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INDUSTRIES,
  BUYER_TYPES,
  BROKER_NOTIFICATION_EVENTS,
  BUYER_NOTIFICATION_EVENTS,
} from "@/lib/constants";

type NotificationPrefs = Record<string, { email: boolean; in_platform: boolean }>;

export default function SettingsPage() {
  const router = useRouter();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [title, setTitle] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [industryFocus, setIndustryFocus] = useState<string[]>([]);
  const [credentials, setCredentials] = useState("");
  const [dealTypes, setDealTypes] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [aum, setAum] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedIn, setLinkedIn] = useState("");

  // Firm state
  const [firmName, setFirmName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [firmLocation, setFirmLocation] = useState("");

  // Notification state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({});

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  // UI state
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  // Load profile and notification preferences
  useEffect(() => {
    async function loadData() {
      const [profileRes, notifRes] = await Promise.all([
        fetch("/api/settings/profile"),
        fetch("/api/settings/notifications"),
      ]);

      if (profileRes.ok) {
        const { profile, firm } = await profileRes.json();
        const supabase = createClient();
        setRole(profile.role || "");
        setFullName(profile.full_name || "");
        setTitle(profile.title || "");
        setAvatarPath(profile.avatar_path || null);
        setAvatarUrl(
          profile.avatar_path
            ? supabase.storage.from("profile-pictures").getPublicUrl(profile.avatar_path).data.publicUrl
            : null
        );
        setLocation(profile.location || "");
        setIndustryFocus(profile.industry_focus || []);
        setCredentials(profile.license_credentials || "");
        setDealTypes(profile.deal_types || "");
        setBuyerType(profile.buyer_type || "");
        setAum(profile.aum || "");
        setPhone(profile.phone || "");
        setLinkedIn(profile.linkedin || "");

        if (firm) {
          setFirmName(firm.name || "");
          setDescription(firm.description || "");
          setWebsite(firm.website || "");
          setFirmLocation(firm.location || "");
        }
      }

      if (notifRes.ok) {
        const { preferences } = await notifRes.json();
        setNotificationPrefs(preferences || {});
      }
    }
    loadData();
  }, []);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Profile picture must be an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("Profile picture must be 5MB or smaller.");
      return;
    }

    setAvatarUploading(true);
    setProfileMessage("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Authentication required");
      }

      const avatarStoragePath = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(avatarStoragePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload profile picture.");
      }

      const saveResponse = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPath: avatarStoragePath }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save profile picture.");
      }

      const publicUrl = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(avatarStoragePath).data.publicUrl;

      setAvatarPath(avatarStoragePath);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      setProfileMessage("Profile picture updated.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to upload profile picture."
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!avatarPath) return;

    setAvatarUploading(true);
    setProfileMessage("");

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPath: null }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove profile picture.");
      }

      setAvatarPath(null);
      setAvatarUrl(null);
      setProfileMessage("Profile picture removed.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to remove profile picture."
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        title,
        phone,
        linkedIn,
        location,
        industryFocus,
        licenseCredentials: credentials,
        dealTypes,
        buyerType,
        aum,
        firmName,
        description,
        website,
        firmLocation,
      }),
    });
    setProfileSaving(false);
    setProfileMessage(res.ok ? "Profile saved." : "Failed to save profile.");
  };

  const notificationEvents =
    role === "broker" ? BROKER_NOTIFICATION_EVENTS : BUYER_NOTIFICATION_EVENTS;

  const toggleNotification = (eventKey: string, channel: "email" | "in_platform") => {
    setNotificationPrefs((prev) => {
      const current = prev[eventKey] || { email: true, in_platform: true };
      return {
        ...prev,
        [eventKey]: { ...current, [channel]: !current[channel] },
      };
    });
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    setNotifMessage("");
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: notificationPrefs }),
    });
    setNotifSaving(false);
    setNotifMessage(res.ok ? "Preferences saved." : "Failed to save preferences.");
  };

  const handleDeleteAccount = async () => {
    if (confirmDelete !== "DELETE") return;
    setDeleting(true);
    const res = await fetch("/api/settings/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    if (res.ok) {
      router.push("/");
    } else {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>

        {/* ─── Edit Profile ────────────────────────────────────── */}
        <section className="bg-surface-alt rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Edit Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Profile Picture
              </label>
              <div className="flex flex-col gap-4 rounded-lg border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${fullName || "User"} profile picture`}
                    className="h-20 w-20 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                    {(fullName || "User")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">
                    Upload a square JPG, PNG, WEBP, or GIF up to 5MB.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-btn-hover">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarChange}
                        className="sr-only"
                        disabled={avatarUploading}
                      />
                      {avatarUploading ? "Uploading..." : avatarPath ? "Replace Photo" : "Upload Photo"}
                    </label>
                    {avatarPath && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        disabled={avatarUploading}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., (555) 123-4567"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={linkedIn}
                onChange={(e) => setLinkedIn(e.target.value)}
                placeholder="https://www.linkedin.com/in/your-profile"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Firm Name
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Industry Focus
              </label>
              <select
                multiple
                value={industryFocus}
                onChange={(e) =>
                  setIndustryFocus(
                    Array.from(e.target.selectedOptions, (o) => o.value)
                  )
                }
                className="w-full border rounded-md px-3 py-2 text-sm h-32"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            {/* Broker-specific fields */}
            {role === "broker" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    License & Credentials
                  </label>
                  <input
                    type="text"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Deal Types
                  </label>
                  <input
                    type="text"
                    value={dealTypes}
                    onChange={(e) => setDealTypes(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {/* Buyer-specific fields */}
            {role === "buyer" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Buyer Type
                  </label>
                  <select
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select type</option>
                    {BUYER_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Assets Under Management (AUM)
                  </label>
                  <input
                    type="text"
                    value={aum}
                    onChange={(e) => setAum(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="bg-primary text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
              {profileMessage && (
                <span className="text-sm text-text-secondary">{profileMessage}</span>
              )}
            </div>
          </div>
        </section>

        {/* ─── Notification Preferences ─────────────────────── */}
        <section className="bg-surface-alt rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">
            Notification Preferences
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-text">
                    Event
                  </th>
                  <th className="text-center py-2 px-4 font-medium text-text">
                    Email
                  </th>
                  <th className="text-center py-2 px-4 font-medium text-text">
                    In-Platform
                  </th>
                </tr>
              </thead>
              <tbody>
                {notificationEvents.map((event) => {
                  const prefs = notificationPrefs[event.key] || {
                    email: true,
                    in_platform: true,
                  };
                  return (
                    <tr key={event.key} className="border-b">
                      <td className="py-2 pr-4 text-text-secondary">
                        {event.label}
                      </td>
                      <td className="text-center py-2 px-4">
                        <input
                          type="checkbox"
                          checked={prefs.email}
                          onChange={() => toggleNotification(event.key, "email")}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="text-center py-2 px-4">
                        <input
                          type="checkbox"
                          checked={prefs.in_platform}
                          onChange={() =>
                            toggleNotification(event.key, "in_platform")
                          }
                          className="w-4 h-4"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="bg-primary text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-btn-hover transition-colors disabled:opacity-50"
            >
              {notifSaving ? "Saving..." : "Save Preferences"}
            </button>
            {notifMessage && (
              <span className="text-sm text-text-secondary">{notifMessage}</span>
            )}
          </div>
        </section>

        {/* ─── Delete Account ───────────────────────────────── */}
        <section className="bg-surface-alt rounded-lg shadow-sm p-6 border border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Delete Account
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            This action is permanent and cannot be undone. All your data will be
            permanently deleted.
          </p>

          {!showDeleteModal ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Delete My Account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-4">
              <p className="text-sm font-medium text-red-800">
                Are you sure? This will:
              </p>
              <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
                {role === "broker" ? (
                  <>
                    <li>Terminate all your active deals</li>
                    <li>Notify all engaged buyers</li>
                  </>
                ) : (
                  <>
                    <li>End all your active deal engagements</li>
                  </>
                )}
                <li>Permanently delete all your data</li>
                <li>Delete your account</li>
              </ul>
              <div>
                <label className="block text-sm font-medium text-red-800 mb-1">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border border-red-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmDelete !== "DELETE" || deleting}
                  className="bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Permanently Delete Account"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmDelete("");
                  }}
                  className="border border-gray-300 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
