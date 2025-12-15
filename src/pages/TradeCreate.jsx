import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";
import { createTrade } from "../services/tradeApi";
import { useToast } from "../components/ToastProvider";
import { resolveHandle } from "../utils/handles";

function TradeCreate() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [yourCards, setYourCards] = useState([]);
  const [theirCards, setTheirCards] = useState([]);
  const [yourTotal, setYourTotal] = useState(0);
  const [theirTotal, setTheirTotal] = useState(0);
  const [yourPage, setYourPage] = useState(1);
  const [theirPage, setTheirPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedYours, setSelectedYours] = useState([]);
  const [selectedTheirs, setSelectedTheirs] = useState([]);
  const [targetUserId, setTargetUserId] = useState(searchParams.get("with") || "");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [yourFilters, setYourFilters] = useState({ rarity: "All", search: "" });
  const [theirFilters, setTheirFilters] = useState({ rarity: "All", search: "" });
  const [targetProfile, setTargetProfile] = useState(null);
  const [allowTrades, setAllowTrades] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [bypassMode, setBypassMode] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [proposed, setProposed] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndCards = async () => {
      const { user, bypass } = await getUserOrBypass();
      if (bypass) {
        setBypassMode(true);
        setLoadError("Trading is disabled in admin bypass mode. Please sign in normally.");
        return;
      }
      setBypassMode(false);
      if (!user) return navigate("/login");
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("allow_trades")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && typeof profile.allow_trades === "boolean") {
        setAllowTrades(profile.allow_trades);
      }

      // Always load your cards
      await loadYourCards(1, user.id);

      if (!targetUserId) {
        setTargetProfile(null);
        setTheirCards([]);
        setTheirTotal(0);
        setSelectedTheirs([]);
        setLoadError("");
        return;
      }

      const { data: targetInfo } = await supabase
        .from("profiles")
        .select("id, username, allow_trades")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetInfo) setTargetProfile(targetInfo);
      await loadTheirCards(1, targetUserId);
      setLoadError("");
    };

    fetchUserAndCards();
  }, [targetUserId, navigate]);

  const loadYourCards = async (page, ownerId = user?.id) => {
    if (!ownerId || bypassMode) return;
    setLoadError("");
    setYourCards([]);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from("cards")
      .select("*", { count: "exact" })
      .eq("owner_id", ownerId)
      .eq("locked", false)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) {
      console.error("Failed to load your cards", error);
      setLoadError(error.message || "Failed to load your cards.");
      return;
    }
    setYourCards(data || []);
    setYourTotal(count || 0);
    setYourPage(page);
  };

  const loadTheirCards = async (page, ownerId) => {
    if (!ownerId || bypassMode) return;
    setLoadError("");
    setTheirCards([]);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from("cards")
      .select("*", { count: "exact" })
      .eq("owner_id", ownerId)
      .eq("locked", false)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) {
      console.error("Failed to load recipient cards", error);
      setLoadError(error.message || "Failed to load recipient cards. They may be hidden or unavailable.");
      return;
    }
    setTheirCards(data || []);
    setTheirTotal(count || 0);
    setTheirPage(page);
  };

  const searchRecipients = async () => {
    if (!recipientQuery.trim()) return;
    const { bypass } = await getUserOrBypass();
    if (bypass) {
      toast("Trading is disabled in admin bypass mode. Please sign in normally.", "error");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const { data, error } = await supabase.rpc("trade_search_profiles", { p_query: recipientQuery });
      if (error) {
        console.error("Search error", error);
        setRecipientResults([]);
        setSearchError(error.message || "Search failed. Try again.");
      } else {
        setRecipientResults(data || []);
        if (!data?.length) {
          setSearchError("No users found.");
        }
      }
    } finally {
      setSearching(false);
    }
  };

  const normalizeId = (card) => {
    if (!card) return null;
    const candidate =
      card.id ??
      card.card_id ??
      card.cardId ??
      card.cardID ??
      card.uuid ??
      null;
    return candidate ? String(candidate) : null;
  };

  const toggleSelect = (id, list, setList) => {
    if (!id) return;
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyFilters = (cards, filters) => {
    return cards.filter((card) => {
      const matchesRarity =
        filters.rarity === "All" ||
        (card.rarity || "").toLowerCase() === filters.rarity.toLowerCase();
      const matchesSearch =
        !filters.search ||
        (card.name || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        (card.description || "").toLowerCase().includes(filters.search.toLowerCase());
      return matchesRarity && matchesSearch;
    });
  };

  const proposeTrade = async () => {
    if (!targetUserId) {
      toast("Select a recipient first.", "error");
      return;
    }
    if (bypassMode) {
      toast("Trading is disabled in admin bypass mode. Please sign in normally.", "error");
      return;
    }
    if (targetProfile && targetProfile.allow_trades === false) {
      toast("This user is not accepting trades right now.", "error");
      return;
    }
    if (targetUserId === user.id) {
      toast("You cannot trade with yourself.", "error");
      return;
    }
    if (!selectedYours.length || !selectedTheirs.length) {
      toast("Select cards on both sides before sending.", "error");
      return;
    }
    setShowReview(true);
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Propose a trade</h1>
        <p className="text-white/70 text-sm mt-1">
          Select your cards and what you want in return. Both sides must be unlocked to trade.
        </p>
        {loadError && <p className="text-red-400 text-sm mt-2">{loadError}</p>}
      </div>

      <div className="glass p-5 border border-purple-400/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Allow trades to my inventory</h2>
            <p className="text-white/70 text-sm">Toggle visibility so others can offer you trades.</p>
          </div>
          <button
            disabled={savingVisibility}
            onClick={async () => {
              setSavingVisibility(true);
              const next = !allowTrades;
              const { error } = await supabase
                .from("profiles")
                .update({ allow_trades: next })
                .eq("id", user.id);
              if (error) {
                toast("Failed to update visibility: " + error.message, "error");
              } else {
                setAllowTrades(next);
              }
              setSavingVisibility(false);
            }}
            className="px-4 py-2 rounded-lg border border-white/15 text-sm bg-white/5 hover:bg-white/10 transition"
          >
            {allowTrades ? "Hide my inventory" : "Allow trades to my inventory"}
          </button>
        </div>
      </div>

      <div className="glass p-5 border border-purple-400/30">
        <h2 className="text-lg font-semibold mb-3">Choose a recipient</h2>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="text"
            value={recipientQuery}
            onChange={(e) => setRecipientQuery(e.target.value)}
            placeholder="Search by username"
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm flex-1"
          />
          <button onClick={searchRecipients} className="cta px-4 py-2 min-w-[140px]" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
        {searchError && <p className="text-sm text-red-400 mt-2">{searchError}</p>}
        {recipientResults.length > 0 && (
          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {recipientResults.map((rec) => (
              <button
                key={rec.id}
                onClick={() => {
                  setTargetUserId(rec.id);
                  loadTheirCards(1, rec.id);
                  setRecipientResults([]);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  targetUserId === rec.id ? "border-purple-400/70 bg-purple-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="font-semibold">{resolveHandle(rec.username, rec.id)}</div>
                <div className="text-xs text-white/60 break-all">
                  ID: {`${rec.id.slice(0, 4)}...${rec.id.slice(-4)}`}
                </div>
              </button>
            ))}
          </div>
        )}
        {targetUserId && (
          <p className="text-sm text-green-400 mt-2">
            Recipient selected: {resolveHandle(targetProfile?.username, targetUserId)}
            {targetProfile && targetProfile.allow_trades === false && " (not accepting trades)"}
          </p>
        )}
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="glass p-6 border border-yellow-300/50 w-full max-w-3xl">
            <h2 className="text-xl font-semibold mb-2">Review trade</h2>
            <p className="text-white/70 text-sm">Confirm the cards you are offering and requesting.</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="pill mb-2">You offer</p>
                <div className="card-grid">
                  {yourCards.filter((c) => selectedYours.includes(normalizeId(c))).map((card) => (
                    <div key={normalizeId(card)} className="glass p-3 border-2 border-amber-300/70">
                      <p className="font-semibold">{card.name}</p>
                      <p className="text-xs text-white/60">{card.rarity}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="pill mb-2">You request</p>
                <div className="card-grid">
                  {theirCards.filter((c) => selectedTheirs.includes(normalizeId(c))).map((card) => (
                    <div key={normalizeId(card)} className="glass p-3 border-2 border-amber-300/70">
                      <p className="font-semibold">{card.name}</p>
                      <p className="text-xs text-white/60">{card.rarity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowReview(false)}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSending(true);
                  try {
                    await createTrade(targetUserId, selectedYours, selectedTheirs);
                    toast("Trade sent securely!");
                    setProposed(true);
                    setShowReview(false);
                  } catch (err) {
                    toast("Error sending trade: " + err.message, "error");
                  } finally {
                    setSending(false);
                  }
                }}
                className="cta px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sending}
              >
                {sending ? "Sending..." : "Confirm & send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {proposed && (
        <div className="glass p-5 border border-green-400/30">
          <h2 className="text-lg font-semibold mb-2">Proposed trade sent</h2>
          <p className="text-white/70 text-sm">Here’s what you offered and requested.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <div>
            <p className="pill mb-2">You offered</p>
            <div className="card-grid">
                {yourCards.filter((c) => selectedYours.includes(normalizeId(c))).map((card) => (
                  <div key={normalizeId(card)} className="glass p-3 border border-green-400/50">
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-xs text-white/60">{card.rarity}</p>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <p className="pill mb-2">You requested</p>
            <div className="card-grid">
                {theirCards.filter((c) => selectedTheirs.includes(normalizeId(c))).map((card) => (
                  <div key={normalizeId(card)} className="glass p-3 border border-purple-400/50">
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-xs text-white/60">{card.rarity}</p>
                  </div>
                ))}
            </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/trades")}
            className="cta mt-4 px-4 py-2"
          >
            Go to Trades
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-4">
          <h2 className="text-lg font-semibold mb-3">Your cards</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {["All", "common", "rare", "epic", "legendary", "mythic"].map((rarity) => (
              <button
                key={rarity}
                onClick={() => setYourFilters((f) => ({ ...f, rarity }))}
                className={`px-3 py-2 rounded-lg text-xs border ${
                  yourFilters.rarity === rarity ? "border-purple-300/70 bg-purple-500/20" : "border-white/10 bg-white/5"
                }`}
              >
                {rarity}
              </button>
            ))}
            <input
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs flex-1 min-w-[140px]"
              placeholder="Search name/desc"
              value={yourFilters.search}
              onChange={(e) => setYourFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="card-grid">
            {applyFilters(yourCards, yourFilters).map((card) => {
              const id = normalizeId(card);
              const selected = id ? selectedYours.includes(id) : false;
              return (
                <div
                  key={id || `no-id-${card.name}`}
                  className={`relative glass p-3 border-2 ${selected ? "border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.9)] bg-amber-500/10" : "border-white/10"} ${id ? "cursor-pointer" : "opacity-60"} transition`}
                  onClick={() => (id ? toggleSelect(id, selectedYours, setSelectedYours) : null)}
                >
                  {selected && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-amber-300/80"></div>
                  )}
                  <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                  <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                  <p className="text-xs text-white/60">{card.rarity}</p>
                </div>
              );
            })}
          </div>
          {yourTotal > pageSize && (
            <div className="flex justify-between items-center mt-3 text-sm text-white/70">
              <button
                onClick={() => loadYourCards(Math.max(1, yourPage - 1))}
                disabled={yourPage === 1}
                className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                Page {yourPage} / {Math.max(1, Math.ceil(yourTotal / pageSize))}
              </span>
              <button
                onClick={() => loadYourCards(yourPage + 1)}
                disabled={yourPage >= Math.ceil(yourTotal / pageSize)}
                className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="glass p-4">
          <h2 className="text-lg font-semibold mb-3">Their cards</h2>
          {targetProfile && targetProfile.allow_trades === false ? (
            <div className="text-white/70 text-sm">
              This collector has disabled incoming trades. Ask them to toggle visibility to proceed.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {["All", "common", "rare", "epic", "legendary", "mythic"].map((rarity) => (
                  <button
                    key={rarity}
                    onClick={() => setTheirFilters((f) => ({ ...f, rarity }))}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      theirFilters.rarity === rarity ? "border-purple-300/70 bg-purple-500/20" : "border-white/10 bg-white/5"
                    }`}
                  >
                    {rarity}
                  </button>
                ))}
                <input
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs flex-1 min-w-[140px]"
                  placeholder="Search name/desc"
                  value={theirFilters.search}
                  onChange={(e) => setTheirFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              {applyFilters(theirCards, theirFilters).length === 0 ? (
                <div className="text-white/70 text-sm">No cards to show yet.</div>
              ) : (
                <div className="card-grid">
                  {applyFilters(theirCards, theirFilters).map((card) => {
                    const id = normalizeId(card);
                    const selected = id ? selectedTheirs.includes(id) : false;
                    return (
                      <div
                        key={id || `no-id-${card.name}`}
                        className={`relative glass p-3 border-2 ${selected ? "border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.9)] bg-amber-500/10" : "border-white/10"} ${id ? "cursor-pointer" : "opacity-60"} transition`}
                        onClick={() => (id ? toggleSelect(id, selectedTheirs, setSelectedTheirs) : null)}
                      >
                        {selected && (
                          <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-amber-300/80"></div>
                        )}
                        <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                        <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                        <p className="text-xs text-white/60">{card.rarity}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {theirTotal > pageSize && (
                <div className="flex justify-between items-center mt-3 text-sm text-white/70">
                  <button
                    onClick={() => loadTheirCards(Math.max(1, theirPage - 1), targetUserId)}
                    disabled={theirPage === 1}
                    className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    Page {theirPage} / {Math.max(1, Math.ceil(theirTotal / pageSize))}
                  </span>
                  <button
                    onClick={() => loadTheirCards(theirPage + 1, targetUserId)}
                    disabled={theirPage >= Math.ceil(theirTotal / pageSize)}
                    className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

          <div className="text-center">
            <button
              onClick={proposeTrade}
              disabled={selectedYours.length === 0 || selectedTheirs.length === 0}
              className="cta px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Trade Offer
            </button>
          </div>
    </div>
  );
}

export default TradeCreate;
