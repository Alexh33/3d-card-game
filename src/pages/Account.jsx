import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";
import { useToast } from "../components/ToastProvider";
import { generateHandleFromId } from "../utils/handles";

function Account() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { user, bypass } = await getUserOrBypass();
      if (!user) {
        setError("Please sign in to manage your account.");
        setLoading(false);
        return;
      }
      setUser(user);
      if (bypass) {
        setError("Account editing is disabled in admin bypass mode.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, claimed_username, allow_trades, email")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setError(error.message || "Could not load profile.");
      } else {
        const fallback = generateHandleFromId(user.id);
        setProfile(data);
        setUsername(data?.username || fallback);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim(), claimed_username: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast("Failed to claim username: " + error.message, "error");
    } else {
      toast("Username claimed!", "success");
      setProfile((p) => ({ ...p, username: username.trim(), claimed_username: true }));
    }
  };

  const claimed = profile?.claimed_username;

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Account</p>
        <h1 className="text-3xl font-semibold">Your profile</h1>
        <p className="text-white/70 text-sm">Claim a custom collector name once per account.</p>
      </div>

      <div className="glass p-6 border border-white/10 max-w-2xl">
        {loading ? (
          <p className="text-white/70">Loading...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-white/60">Current handle</p>
                <p className="text-lg font-semibold">{profile?.username || generateHandleFromId(user.id)}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Account email</p>
                <p className="text-lg font-semibold text-white/80">{profile?.email || user.email}</p>
              </div>
            </div>
            <label className="text-sm text-white/70">Claim your custom name (one-time)</label>
            <input
              className="mt-1 w-full px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-white"
              value={username}
              disabled={claimed}
              maxLength={32}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your display name"
            />
            <p className="text-xs text-white/50 mt-1">Once you claim, this cannot be changed.</p>
            <div className="mt-4 flex gap-3">
              <button
                className="cta px-5 py-3 disabled:opacity-50"
                onClick={handleSave}
                disabled={claimed || saving || !username.trim()}
              >
                {claimed ? "Already claimed" : saving ? "Saving..." : "Claim name"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Account;
