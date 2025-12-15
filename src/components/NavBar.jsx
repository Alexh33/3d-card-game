import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserOrBypass, disableBypass } from "../utils/authBypass";
import { useToast } from "./ToastProvider";
import { generateHandleFromId } from "../utils/handles";

function NavBar() {
  const toast = useToast();
  const [unopenedCount, setUnopenedCount] = useState(0);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tradeAlerts, setTradeAlerts] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const navigate = useNavigate();

  // Fetch unopened pack count from Supabase
  useEffect(() => {
    const fetchUnopenedPackCount = async () => {
      const { user } = await getUserOrBypass();
      if (!user) {
        setUnopenedCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("packs")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("opened", false);

      if (error) {
        console.error("Error fetching unopened pack count:", error.message);
      } else {
        setUnopenedCount(count);
      }
    };

    fetchUnopenedPackCount();
    const interval = setInterval(fetchUnopenedPackCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get logged-in user and subscribe to auth changes
  useEffect(() => {
    let unsub;
    getUserOrBypass().then(({ user, bypass }) => {
      setUser(user);
      if (bypass) return;
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsub = listener?.subscription;
    });

    return () => unsub?.unsubscribe();
  }, []);

  // Trade notifications (badge + toasts)
  useEffect(() => {
    let channel;
    const setup = async () => {
      const { user } = await getUserOrBypass();
      if (!user) return;

      const { count } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      setTradeAlerts(count || 0);

      channel = supabase
        .channel("trade-notifs")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "trades", filter: `to_user_id=eq.${user.id}` },
          (payload) => {
            setTradeAlerts((c) => c + 1);
            const msg = `New trade from ${generateHandleFromId(payload.new.from_user_id)}`;
            setRecentAlerts((prev) => [{ msg, ts: new Date().toISOString() }, ...prev].slice(0, 5));
            setUnreadAlerts((c) => c + 1);
            toast(msg, "info");
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "trades", filter: `to_user_id=eq.${user.id}` },
          (payload) => {
            const wasPending = payload.old.status === "pending" && new Date(payload.old.expires_at) > new Date();
            const nowPending = payload.new.status === "pending" && new Date(payload.new.expires_at) > new Date();
            if (wasPending && !nowPending) {
              setTradeAlerts((c) => Math.max(0, c - 1));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "trades", filter: `from_user_id=eq.${user.id}` },
          (payload) => {
            if (
              payload.old.status !== payload.new.status &&
              ["accepted", "declined", "expired"].includes(payload.new.status)
            ) {
              const msg = `Your trade was ${payload.new.status}`;
              setRecentAlerts((prev) => [{ msg, ts: new Date().toISOString() }, ...prev].slice(0, 5));
              setUnreadAlerts((c) => c + 1);
              toast(msg, payload.new.status === "accepted" ? "info" : "error");
            }
          }
        )
        .subscribe();
    };
    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    disableBypass();
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="backdrop-blur-lg bg-black/50 border-b border-white/10 sticky top-0 z-40">
      <div className="page-shell flex items-center gap-6 py-4">
        <Link to="/" className="flex items-center gap-3 text-white font-semibold text-lg tracking-tight">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-500 shadow-lg shadow-purple-800/40 flex items-center justify-center text-sm">
            C
          </span>
          <div>
            <p className="leading-tight">Collect The Net</p>
            <p className="text-xs text-white/60 font-normal">Collect the internet</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium ml-2 flex-wrap">
          <Link to="/" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white">
            Home
          </Link>
          <Link to="/inventory" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white relative">
            Inventory
            {unopenedCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-fuchsia-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center">
                {unopenedCount}
              </span>
            )}
          </Link>
          <Link to="/collection" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white">
            Collection
          </Link>
          <Link to="/spin" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white">
            Daily Spin
          </Link>
          <Link to="/trades" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white relative">
            Trades
            {tradeAlerts > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-400 text-black rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                {tradeAlerts}
              </span>
            )}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/inventory"
            className="hidden md:inline-flex px-3 py-2 rounded-lg border border-purple-400/50 text-purple-100 hover:bg-purple-600/20 transition"
          >
            Open Packs
          </Link>
          <div className="relative">
            <button
              onClick={() => {
                setAlertsOpen((o) => !o);
                setUnreadAlerts(0);
              }}
              className="h-10 w-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition"
            >
              🔔
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                  {unreadAlerts}
                </span>
              )}
            </button>
            {alertsOpen && (
              <div className="absolute right-0 mt-2 w-72 glass p-3 border border-white/10 z-30">
                <p className="text-xs text-white/60 mb-2">Recent trade alerts</p>
                {recentAlerts.length === 0 && <p className="text-white/60 text-sm">No recent alerts</p>}
                {recentAlerts.map((a, idx) => (
                  <div key={idx} className="text-sm text-white/80 border-t border-white/10 first:border-t-0 py-1">
                    {a.msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="h-10 w-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition"
                >
                  {user.email?.[0]?.toUpperCase() || "👤"}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 w-60 mt-3 p-4 glass text-sm z-10">
                    <p className="text-white font-semibold truncate">{user.email}</p>
                    <p className="text-white/60 text-xs mb-3">Signed in</p>
                    <button
                      onClick={handleLogout}
                  className="w-full cta text-sm py-2 mt-1"
                >
                  Log Out
                </button>
                <Link
                  to="/account"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 inline-flex w-full px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/10 transition text-sm text-center"
                >
                  Account
                </Link>
              </div>
            )}
          </>
            ) : (
              <Link
                to="/login"
                className="px-3 py-2 rounded-lg bg-white text-black font-semibold hover:scale-[1.01] transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavBar;
