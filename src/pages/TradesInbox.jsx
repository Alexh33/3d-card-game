import React, { useEffect, useState, useCallback } from "react";
import { getUserOrBypass } from "../utils/authBypass";
import { acceptTrade, declineTrade, fetchPendingTrades, cancelTrade } from "../services/tradeApi";
import { Link } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { supabase } from "../supabaseClient";
import { resolveHandle } from "../utils/handles";
import { TradingCard } from "../components/pack/TradingCard";

function TradesInbox() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [incomingTrades, setIncomingTrades] = useState([]);
  const [outgoingTrades, setOutgoingTrades] = useState([]);
  const [historyTrades, setHistoryTrades] = useState([]);
  const [cardLookup, setCardLookup] = useState({});
  const [profileLookup, setProfileLookup] = useState({});
  const LOCK_HOURS = 12;
  const [confirmTrade, setConfirmTrade] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("incoming");

  const fetchUserAndTrades = useCallback(async () => {
    const { user } = await getUserOrBypass();
    if (!user) return;

    setUser(user);

    try {
      await supabase.rpc("expire_stale_trades");
    } catch (_) {
      // ignore
    }

    const incoming = await fetchPendingTrades();
    setIncomingTrades(incoming || []);

    const { data: sent, error: sentErr } = await supabase
      .from("trades")
      .select("*")
      .eq("from_user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (!sentErr) setOutgoingTrades(sent || []);

    const { data: history } = await supabase
      .from("trades")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistoryTrades(history || []);
  }, []);

  useEffect(() => {
    fetchUserAndTrades();
  }, [fetchUserAndTrades]);

  // Live updates for incoming trades
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`trades-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `to_user_id=eq.${user.id}` },
        (payload) => {
          setIncomingTrades((prev) => {
            const exists = prev.some((t) => t.id === payload.new.id);
            if (exists) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `to_user_id=eq.${user.id}` },
        (payload) => {
          setIncomingTrades((prev) => {
            const updated = prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            // Remove non-pending trades
            return updated.filter((t) => t.status === "pending");
          });
          if (payload.new.status !== "pending") {
            setHistoryTrades((prev) => [{ ...payload.new }, ...prev.filter((t) => t.id !== payload.new.id)].slice(0, 50));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `from_user_id=eq.${user.id}` },
        (payload) => {
          setOutgoingTrades((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `from_user_id=eq.${user.id}` },
        (payload) => {
          setOutgoingTrades((prev) => {
            const updated = prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            return updated.filter((t) => t.status === "pending");
          });
          setHistoryTrades((prev) => {
            const remaining = prev.filter((t) => t.id !== payload.new.id);
            if (payload.new.status !== "pending") return [payload.new, ...remaining].slice(0, 50);
            return remaining;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load card details for displayed trades (via secure RPC bound to parties)
  useEffect(() => {
    const loadCards = async () => {
      const trades = [...incomingTrades, ...outgoingTrades, ...historyTrades];
      if (!trades.length) {
        setCardLookup({});
        return;
      }
      const tradeIds = trades.map((t) => t.id).filter(Boolean);
      if (!tradeIds.length) return;
      const { data, error } = await supabase.rpc("trade_cards_for_party", { p_trade_ids: tradeIds });
      if (error) {
        console.error("Failed to fetch trade cards", error);
        return;
      }
      const map = {};
      (data || []).forEach((c) => {
        if (c.card_id) map[String(c.card_id)] = c;
      });
      setCardLookup(map);

      // Preload related profiles (both directions)
      const userIds = Array.from(
        new Set(trades.flatMap((t) => [t.from_user_id, t.to_user_id]).filter(Boolean))
      );
      if (userIds.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id,username")
          .in("id", userIds);
        if (!profErr && profs) {
          setProfileLookup((prev) => {
            const next = { ...prev };
            profs.forEach((p) => {
              next[p.id] = resolveHandle(p.username, p.id);
            });
            return next;
          });
        }
      }
    };
    loadCards();
  }, [incomingTrades, outgoingTrades, historyTrades]);

  const expiresAt = (trade) => {
    if (trade.expires_at) return new Date(trade.expires_at);
    const created = trade.created_at ? new Date(trade.created_at) : null;
    if (!created) return null;
    return new Date(created.getTime() + LOCK_HOURS * 60 * 60 * 1000);
  };

  const isExpired = (trade) => {
    const exp = expiresAt(trade);
    return exp ? exp.getTime() <= Date.now() : false;
  };

  const countdown = (trade) => {
    const exp = expiresAt(trade);
    if (!exp) return "";
    const diff = exp.getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `${hrs}h ${mins}m left`;
  };

  const respondToTrade = async (trade, accept) => {
    if (isExpired(trade)) {
      toast("This trade has expired.", "error");
      setIncomingTrades((prev) => prev.filter((t) => t.id !== trade.id));
      return;
    }
    try {
      setProcessing(true);
      if (accept) {
        await acceptTrade(trade.id);
      } else {
        await declineTrade(trade.id);
      }
      setIncomingTrades(prev => prev.filter(t => t.id !== trade.id));
    } catch (err) {
      toast(err.message || "Trade update failed", "error");
    } finally {
      setProcessing(false);
      setConfirmTrade(null);
    }
  };

  const shortId = (id) => (id ? `${String(id).slice(0, 4)}...${String(id).slice(-4)}` : "Unknown");

  const renderCardGrid = (ids = []) => {
    if (!ids.length) return <span className="text-white/50">—</span>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-3 justify-items-start">
        {ids.map((id) => {
          const card = cardLookup[id];
          const normalized = card
            ? {
                ...card,
                id: card.card_id || card.id || id,
                name: card.name || `Card ${shortId(id)}`,
                rarity: (card.rarity || "common").toLowerCase(),
                clarityIndex: card.clarityIndex ?? card.clarity_index ?? 50,
                description: card.description || "Traded collectible",
                category: card.category || "Trade",
              }
            : {
                id,
                name: `Card ${shortId(id)}`,
                rarity: "common",
                clarityIndex: 50,
                description: "Traded collectible",
                category: "Trade",
                image: null,
              };
          return (
            <div key={id} className="flex justify-center">
              <div className="w-full max-w-[200px]">
                <TradingCard card={normalized} className="scale-[0.8] origin-top" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Trades</h1>
        <p className="text-white/70 text-sm">Review incoming offers, your sent offers, and recent history.</p>
        <div className="mt-3">
          <Link
            to="/trades/create"
            className="inline-flex px-4 py-2 rounded-lg border border-purple-400/40 text-white/90 hover:bg-white/10 transition text-sm"
          >
            Start a trade
          </Link>
        </div>
      </div>
      <div className="glass p-4 border border-white/10 flex gap-3">
        {[
          { key: "incoming", label: `Incoming (${incomingTrades.length})` },
          { key: "outgoing", label: `Sent (${outgoingTrades.length})` },
          { key: "history", label: `History (${historyTrades.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm border ${
              activeTab === tab.key ? "border-purple-300/70 bg-purple-500/15 text-white" : "border-white/10 bg-white/5 text-white/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "incoming" && (
        <>
          {incomingTrades.length === 0 ? (
            <div className="glass p-6 text-white/80">No pending trades right now.</div>
          ) : (
            incomingTrades.map((trade) => (
              <div key={trade.id} className="glass p-5 border border-purple-400/30">
                <p className="text-xs text-white/50 mb-1">Trade ID: {trade.id}</p>
                <p className="text-sm text-white/70">From</p>
                <p className="font-semibold">{profileLookup[trade.from_user_id] || resolveHandle(null, trade.from_user_id)}</p>
                <p className="text-xs text-white/50 mt-1">Expires: {countdown(trade)}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80 mt-3">
                  <div>
                    <p className="text-white/60 text-xs uppercase">Cards offered</p>
                    {renderCardGrid(trade.offered_card_ids)}
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase">Cards requested</p>
                    {renderCardGrid(trade.requested_card_ids)}
                  </div>
                </div>
                <div className="mt-4 flex gap-3 items-center">
                  {isExpired(trade) ? (
                    <span className="text-sm text-white/60">Expired</span>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmTrade(trade)}
                        className="cta px-4 py-3"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToTrade(trade, false)}
                        className="px-4 py-3 rounded-xl border border-white/15 text-white/80 hover:bg-white/10 transition"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fetchUserAndTrades()}
                    className="ml-auto px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:bg-white/10 text-xs"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === "outgoing" && (
        <>
          {outgoingTrades.length === 0 ? (
            <div className="glass p-6 text-white/70">No outgoing trades.</div>
          ) : (
            outgoingTrades.map((trade) => (
              <div key={trade.id} className="glass p-5 border border-white/10">
                <p className="text-xs text-white/50 mb-1">Trade ID: {trade.id}</p>
                <p className="text-sm text-white/70">To</p>
                <p className="font-semibold">{profileLookup[trade.to_user_id] || resolveHandle(null, trade.to_user_id)}</p>
                <p className="text-xs text-white/50 mt-1">Expires: {countdown(trade)}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80 mt-3">
                  <div>
                    <p className="text-white/60 text-xs uppercase">You offered</p>
                    {renderCardGrid(trade.offered_card_ids)}
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase">You requested</p>
                    {renderCardGrid(trade.requested_card_ids)}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        await cancelTrade(trade.id);
                        toast("Trade cancelled");
                        setOutgoingTrades((prev) => prev.filter((t) => t.id !== trade.id));
                      } catch (err) {
                        toast(err.message || "Failed to cancel trade", "error");
                      }
                    }}
                    className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition text-sm"
                    disabled={processing}
                  >
                    Cancel trade
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {historyTrades.length === 0 ? (
            <div className="glass p-6 text-white/70">No recent trade activity.</div>
          ) : (
            historyTrades.map((trade) => (
              <div key={trade.id} className="glass p-5 border border-white/10">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <div>
                    <p className="text-xs text-white/50">Trade ID: {trade.id}</p>
                    <p>Status: <span className="capitalize">{trade.status}</span></p>
                  </div>
                  <p className="text-xs text-white/50">Created: {new Date(trade.created_at).toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80 mt-3">
                  <div>
                    <p className="text-white/60 text-xs uppercase">Offered</p>
                    {renderCardGrid(trade.offered_card_ids)}
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase">Requested</p>
                    {renderCardGrid(trade.requested_card_ids)}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {confirmTrade && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass p-6 border border-emerald-300/60 w-full max-w-4xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="pill mb-2">Confirm trade</p>
                <h2 className="text-xl font-semibold">Review before accepting</h2>
                <p className="text-white/70 text-sm">You will receive their offered cards and give the requested ones.</p>
              </div>
              <button
                onClick={() => setConfirmTrade(null)}
                className="text-white/60 hover:text-white text-lg"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-white/60 text-xs uppercase">You receive</p>
                {renderCardGrid(confirmTrade.offered_card_ids)}
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase">You give</p>
                {renderCardGrid(confirmTrade.requested_card_ids)}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setConfirmTrade(null)}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={() => respondToTrade(confirmTrade, true)}
                className="cta px-5 py-3 disabled:opacity-50"
                disabled={processing}
              >
                {processing ? "Accepting..." : "Confirm & accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradesInbox;
