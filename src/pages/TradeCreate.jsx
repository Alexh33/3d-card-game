import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";
import { createTrade } from "../services/tradeApi";

function TradeCreate() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [yourCards, setYourCards] = useState([]);
  const [theirCards, setTheirCards] = useState([]);
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndCards = async () => {
      const { user } = await getUserOrBypass();
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

      if (!targetUserId) return;

      const [yours, theirs, targetInfo] = await Promise.all([
        supabase.from("cards").select("*").eq("owner_id", user.id).eq("locked", false),
        supabase.from("cards").select("*").eq("owner_id", targetUserId).eq("locked", false),
        supabase.from("profiles").select("id, username, allow_trades").eq("id", targetUserId).maybeSingle(),
      ]);

      if (yours.data) setYourCards(yours.data);
      if (theirs.data) setTheirCards(theirs.data);
      if (targetInfo?.data) setTargetProfile(targetInfo.data);
    };

    fetchUserAndCards();
  }, [targetUserId, navigate]);

  const searchRecipients = async () => {
    if (!recipientQuery.trim()) return;
    const { bypass } = await getUserOrBypass();
    if (bypass) {
      alert("Trading is disabled in admin bypass mode. Please sign in normally.");
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

  const toggleSelect = (id, list, setList) => {
    setList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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
      alert("Select a recipient first.");
      return;
    }
    if (targetProfile && targetProfile.allow_trades === false) {
      alert("This user is not accepting trades right now.");
      return;
    }
    if (targetUserId === user.id) {
      alert("You cannot trade with yourself.");
      return;
    }
    if (!selectedYours.length || !selectedTheirs.length) return;
    try {
      await createTrade(targetUserId, selectedYours, selectedTheirs);
      alert("Trade sent securely!");
      navigate("/trades");
    } catch (err) {
      alert("Error sending trade: " + err.message);
    }
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Propose a trade</h1>
        <p className="text-white/70 text-sm mt-1">
          Select your cards and what you want in return. Both sides must be unlocked to trade.
        </p>
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
                alert("Failed to update visibility: " + error.message);
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
                  setRecipientResults([]);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  targetUserId === rec.id ? "border-purple-400/70 bg-purple-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="font-semibold">{rec.username || rec.id}</div>
                <div className="text-xs text-white/60 break-all">{rec.id}</div>
              </button>
            ))}
          </div>
        )}
        {targetUserId && (
          <p className="text-sm text-green-400 mt-2">
            Recipient selected: {targetProfile?.username || targetUserId}
            {targetProfile && targetProfile.allow_trades === false && " (not accepting trades)"}
          </p>
        )}
      </div>

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
            {applyFilters(yourCards, yourFilters).map((card) => (
              <div
                key={card.card_id || card.id}
                className={`glass p-3 border ${selectedYours.includes(card.id) ? "border-green-400/60" : "border-white/10"} cursor-pointer`}
                onClick={() => toggleSelect(card.id, selectedYours, setSelectedYours)}
              >
                <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                <p className="text-xs text-white/60">{card.rarity}</p>
              </div>
            ))}
          </div>
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
              <div className="card-grid">
                {applyFilters(theirCards, theirFilters).map((card) => (
                  <div
                    key={card.card_id || card.id}
                    className={`glass p-3 border ${selectedTheirs.includes(card.id) ? "border-purple-400/70" : "border-white/10"} cursor-pointer`}
                    onClick={() => toggleSelect(card.id, selectedTheirs, setSelectedTheirs)}
                  >
                    <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                    <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                    <p className="text-xs text-white/60">{card.rarity}</p>
                  </div>
                ))}
              </div>
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
