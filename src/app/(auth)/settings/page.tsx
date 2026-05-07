"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Card,
  SelectInput,
  StatusMessage,
  TextareaInput,
  TextInput,
} from "@/components/ui";
import {
  INDUSTRIES,
  BUYER_TYPES,
  BUYER_TYPE_VALUES,
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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Failed to upload profile picture.");
      }

      const { avatarPath: newPath, publicUrl } = await res.json();
      setAvatarPath(newPath);
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
    const payload: Record<string, unknown> = {
      fullName,
      title,
      phone,
      linkedIn,
      location,
      industryFocus,
      licenseCredentials: credentials,
      dealTypes,
      aum,
      firmName,
      description,
      website,
      firmLocation,
    };

    if (
      role === "buyer" &&
      (buyerType === "" ||
        BUYER_TYPE_VALUES.includes(buyerType as (typeof BUYER_TYPE_VALUES)[number]))
    ) {
      payload.buyerType = buyerType;
    }

    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
        <Card>
          <h2 className="text-xl font-semibold text-primary mb-4">Edit Profile</h2>

          <div className="space-y-4">

            {/* ─── Avatar Upload ───────────────────────────────── */}
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

            {/* ─── Profile Fields ────────────────────────────────── */}
            <TextInput
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <TextInput
              label="Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <TextInput
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., (555) 123-4567"
            />

            <TextInput
              label="LinkedIn Profile"
              type="url"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-profile"
            />

            <TextInput
              label="Firm Name"
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
            />

            <TextareaInput
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <TextInput
              label="Location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <SelectInput
              label="Industry Focus"
              multiple
              value={industryFocus}
              onChange={(e) =>
                setIndustryFocus(Array.from(e.target.selectedOptions, (o) => o.value))
              }
              className="h-32"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            {/* Broker-specific fields */}
            {role === "broker" && (
              <>
                <TextInput
                  label="License & Credentials"
                  type="text"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                />
                <TextInput
                  label="Deal Types"
                  type="text"
                  value={dealTypes}
                  onChange={(e) => setDealTypes(e.target.value)}
                />
              </>
            )}

            {/* Buyer-specific fields */}
            {role === "buyer" && (
              <>
                <SelectInput
                  label="Buyer Type"
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value)}
                >
                  <option value="">Select type</option>
                  {BUYER_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </SelectInput>
                <TextInput
                  label="Assets Under Management (AUM)"
                  type="text"
                  value={aum}
                  onChange={(e) => setAum(e.target.value)}
                />
              </>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleProfileSave}
                isLoading={profileSaving}
                loadingText="Saving..."
              >
                Save Profile
              </Button>
              {profileMessage && (
                <StatusMessage>{profileMessage}</StatusMessage>
              )}
            </div>
          </div>
        </Card>

        {/* ─── Notification Preferences ─────────────────────── */}
        <Card>
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
                          aria-label={`${event.label} email`}
                          checked={prefs.email}
                          onChange={() => toggleNotification(event.key, "email")}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="text-center py-2 px-4">
                        <input
                          type="checkbox"
                          aria-label={`${event.label} in-platform`}
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
            <Button
              onClick={handleNotifSave}
              isLoading={notifSaving}
              loadingText="Saving..."
            >
              Save Preferences
            </Button>
            {notifMessage && (
              <StatusMessage>{notifMessage}</StatusMessage>
            )}
          </div>
        </Card>

        {/* ─── Delete Account ───────────────────────────────── */}
        <Card className="border border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Delete Account
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            This action is permanent and cannot be undone. All your data will be
            permanently deleted.
          </p>

          {!showDeleteModal ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete My Account
            </Button>
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
              <TextInput
                label="Type DELETE to confirm"
                type="text"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-red-300 rounded-md px-3 py-2 text-sm"
                labelClassName="text-red-800"
              />
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={confirmDelete !== "DELETE"}
                  isLoading={deleting}
                  loadingText="Deleting..."
                >
                  Permanently Delete Account
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmDelete("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
