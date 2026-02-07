"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-xl min-h-[48px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow bg-white">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-2.5 py-1 rounded-lg"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-blue-400 hover:text-blue-600 ml-0.5"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
            if (e.key === "Backspace" && !input && tags.length > 0) {
              removeTag(tags.length - 1);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-1"
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    totalFetched: number;
    newJobs: number;
    duplicates: number;
  } | null>(null);

  // Account state
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  // Form state
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [remotePreferred, setRemotePreferred] = useState(false);
  const [citizenshipNotRequired, setCitizenshipNotRequired] = useState(true);
  const [workAuthorization, setWorkAuthorization] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const [p, me] = await Promise.all([
        apiFetch<Profile>("/api/profile"),
        apiFetch<{ email: string }>("/api/auth/me"),
      ]);
      setProfile(p);
      setTargetTitles(p.targetTitles);
      setSkills(p.skills);
      setPreferredLocations(p.preferredLocations);
      setRemotePreferred(p.remotePreferred);
      setCitizenshipNotRequired(p.citizenshipNotRequired);
      setWorkAuthorization(p.workAuthorization);
      setEmail(me.email);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiFetch<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          targetTitles,
          skills,
          preferredLocations,
          remotePreferred,
          citizenshipNotRequired,
          workAuthorization,
        }),
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailSaving(true);
    setEmailMsg("");
    try {
      await apiFetch("/api/auth/email", {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      setEmailMsg("Email updated");
      setTimeout(() => setEmailMsg(""), 3000);
    } catch (err) {
      setEmailMsg(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwSaving(true);
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      setPwSaving(false);
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg("Password must be at least 8 characters");
      setPwSaving(false);
      return;
    }
    try {
      await apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPwSaving(false);
    }
  };

  const handleRunRecommended = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await apiFetch<{
        success: boolean;
        totalFetched: number;
        newJobs: number;
        duplicates: number;
      }>("/api/admin/run-recommended", { method: "POST" });
      setRunResult({
        totalFetched: res.totalFetched,
        newJobs: res.newJobs,
        duplicates: res.duplicates,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your preferences to get better job recommendations
        </p>
      </div>

      <div className="space-y-6">
        {/* Tag inputs */}
        <TagInput
          label="Target Job Titles"
          placeholder="e.g. Software Engineer, Full Stack Developer..."
          tags={targetTitles}
          onChange={setTargetTitles}
        />

        <TagInput
          label="Skills & Keywords"
          placeholder="e.g. React, TypeScript, Node.js..."
          tags={skills}
          onChange={setSkills}
        />

        <TagInput
          label="Preferred Locations"
          placeholder="e.g. San Francisco, New York, Remote..."
          tags={preferredLocations}
          onChange={setPreferredLocations}
        />

        {/* Toggles */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Remote Preferred
              </p>
              <p className="text-xs text-gray-500">
                Boost remote positions in recommendations
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRemotePreferred(!remotePreferred)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                remotePreferred ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                  remotePreferred ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Citizenship Not Required
              </p>
              <p className="text-xs text-gray-500">
                Penalize jobs requiring US citizenship / security clearance
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCitizenshipNotRequired(!citizenshipNotRequired)
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                citizenshipNotRequired ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                  citizenshipNotRequired
                    ? "translate-x-6"
                    : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Work authorization */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Work Authorization
          </label>
          <input
            type="text"
            value={workAuthorization}
            onChange={(e) => setWorkAuthorization(e.target.value)}
            placeholder="e.g. US Citizen, H-1B, OPT..."
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              Saved successfully
            </span>
          )}
        </div>

        {/* Run Recommended section */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Recommended Pull
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Fetch new job listings based on your profile. Runs automatically
            every 4 hours.
          </p>

          <button
            onClick={handleRunRecommended}
            disabled={running}
            className={cn(
              "px-6 py-2.5 text-sm font-medium rounded-xl transition-colors",
              running
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {running ? "Running..." : "Run Recommended Now"}
          </button>

          {runResult && (
            <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800">
                Pull complete
              </p>
              <div className="flex gap-4 mt-2 text-sm text-emerald-700">
                <span>Fetched: {runResult.totalFetched}</span>
                <span>New: {runResult.newJobs}</span>
                <span>Duplicates: {runResult.duplicates}</span>
              </div>
            </div>
          )}
        </div>

        {/* Account Settings */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Settings
          </h2>

          {/* Change email */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              <button
                onClick={handleEmailChange}
                disabled={emailSaving}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {emailSaving ? "Saving..." : "Update"}
              </button>
            </div>
            {emailMsg && (
              <p
                className={cn(
                  "text-sm font-medium",
                  emailMsg.includes("updated")
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {emailMsg}
              </p>
            )}
          </div>

          {/* Change password */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Change Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handlePasswordChange}
                disabled={pwSaving || !currentPassword || !newPassword}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {pwSaving ? "Updating..." : "Change Password"}
              </button>
              {pwMsg && (
                <p
                  className={cn(
                    "text-sm font-medium",
                    pwMsg.includes("updated")
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {pwMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Last updated */}
        {profile?.updatedAt && (
          <p className="text-xs text-gray-400 pt-2">
            Last updated:{" "}
            {new Date(profile.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
