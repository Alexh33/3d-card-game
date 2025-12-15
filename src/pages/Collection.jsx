import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { TradingCard } from "../components/pack/TradingCard";
import { RARITY_CONFIG } from "../data/packCards";
import { getUserOrBypass } from "../utils/authBypass";

function Collection() {
  const [cards, setCards] = useState([]);
  const [rarityFilter, setRarityFilter] = useState("All");
  const [psaFilter, setPsaFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [userId, setUserId] = useState(null);
  const [firstOwnerOnly, setFirstOwnerOnly] = useState(false);
  const [search, setSearch] = useState("");

  const normalizeCard = (card) => {
    const rarityKey = (card.rarity || "").toLowerCase();
    return {
      ...card,
      id: card.card_id || card.id,
      rarity: rarityKey,
      rarityLabel: RARITY_CONFIG[rarityKey]?.label || card.rarity || "Common",
      clarityIndex: card.clarity_index ?? card.clarityIndex ?? 50,
      category: card.category || "Collected",
      grade: card.grade || "Ungraded",
    };
  };

  // Fetch user once
  useEffect(() => {
    getUserOrBypass().then(({ user }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch a page when page changes and user is known
  useEffect(() => {
    const fetchPage = async () => {
      if (!userId) return;
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("cards")
        .select("*", { count: "exact" })
        .eq("owner_id", userId);
      if (rarityFilter !== "All") {
        query = query.ilike("rarity", rarityFilter);
      }
      if (psaFilter !== "All") {
        query = query.ilike("grade", `%${psaFilter}%`);
      }
      if (firstOwnerOnly) {
        query = query.eq("owners", 1);
      }
      if (search.trim()) {
        const q = search.trim();
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        console.error("Failed to fetch cards:", error.message);
        setLoading(false);
        return;
      }
      const normalized = (data || []).map(normalizeCard);
      setCards(normalized);
      setTotalCount(count || 0);
      setLoading(false);
    };
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, userId, rarityFilter, psaFilter, firstOwnerOnly, search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [rarityFilter, psaFilter, firstOwnerOnly, search]);

  const clearCollection = () => {
    localStorage.removeItem("collection");
    window.location.reload();
  };

  return (
    <div className="text-white flex flex-col gap-6">
      <div className="glass p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="pill mb-2">Collection</p>
            <h1 className="text-3xl font-semibold">Your meme vault</h1>
            <p className="text-white/70 text-sm max-w-xl">
              Filter by rarity or grade, and browse every card you&apos;ve ripped from packs.
            </p>
          </div>
          <button
            onClick={clearCollection}
            className="px-4 py-3 rounded-xl border border-white/15 text-white/70 hover:bg-white/10 transition text-sm"
          >
            Clear local cache
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {["All", "Common", "Rare", "Epic", "Legendary", "Mythic"].map((rarity) => (
              <button
                key={rarity}
                onClick={() => setRarityFilter(rarity)}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  rarityFilter === rarity
                    ? "border-purple-300/70 bg-purple-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-white/20"
                }`}
              >
                {rarity}
              </button>
            ))}
          </div>

          <select
            value={psaFilter}
            onChange={(e) => setPsaFilter(e.target.value)}
            className="bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All PSA Grades</option>
            <option value="Pristine">PSA 10 - Pristine</option>
            <option value="Mint">PSA 9 - Mint</option>
            <option value="Meme Fresh">PSA 8 - Meme Fresh</option>
            <option value="Used Meme">PSA 7 - Used Meme</option>
            <option value="Scuffed">PSA 6 - Scuffed</option>
            <option value="Meme-Ruined">PSA 4 - Meme-Ruined</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name/description"
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm min-w-[200px]"
          />
          <button
            onClick={() => setFirstOwnerOnly((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm border ${
              firstOwnerOnly ? "border-emerald-300/70 bg-emerald-500/20 text-white" : "border-white/10 bg-white/5 text-white/80 hover:border-white/20"
            }`}
          >
            {firstOwnerOnly ? "First owner only ✓" : "First owner only"}
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="glass p-6 text-white/80">
          <p className="text-lg font-semibold">No cards match these filters</p>
          <p className="text-white/60 text-sm mt-1">Adjust your rarity or grade to see your full set.</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className="glass p-4 border border-purple-400/30 flex flex-col gap-3 items-center relative"
            >
              {card.is_new && (
                <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-emerald-500/80 border border-emerald-300/70 text-black font-semibold">
                  New
                </div>
              )}
              {card.locked && (
                <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-amber-500/20 border border-amber-300/60 text-amber-100">
                  Locked
                </div>
              )}
              <TradingCard card={card} className="scale-90" />
              <div className="flex gap-2 items-center text-xs text-white/70">
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  {card.grade}
                </span>
                <span
                  className="px-2 py-1 rounded-lg border"
                  style={{ borderColor: `${(RARITY_CONFIG[card.rarity] || RARITY_CONFIG.common).color}80` }}
                >
                  {card.rarityLabel}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  Clarity {card.clarityIndex}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  Owner #{card.owners || 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-white/70 text-sm">
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Collection;
