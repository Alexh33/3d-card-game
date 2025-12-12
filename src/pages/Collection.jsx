import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { TradingCard } from "../components/pack/TradingCard";
import { RARITY_CONFIG } from "../data/packCards";

function Collection() {
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [rarityFilter, setRarityFilter] = useState("All");
  const [psaFilter, setPsaFilter] = useState("All");

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

  useEffect(() => {
    const fetchCards = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("owner_id", user.id);

      if (error) {
        console.error("Failed to fetch cards:", error.message);
      } else {
        const normalized = (data || []).map(normalizeCard);
        setCards(normalized);
        setFilteredCards(normalized);
      }
    };

    fetchCards();
  }, []);

  useEffect(() => {
    filterCards();
  }, [rarityFilter, psaFilter, cards]);

  const filterCards = () => {
    let filtered = [...cards];

    if (rarityFilter !== "All") {
      filtered = filtered.filter(card => card.rarity === rarityFilter.toLowerCase());
    }

    if (psaFilter !== "All") {
      filtered = filtered.filter(card => card.grade && card.grade.includes(psaFilter));
    }

    setFilteredCards(filtered);
  };

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
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="glass p-6 text-white/80">
          <p className="text-lg font-semibold">No cards match these filters</p>
          <p className="text-white/60 text-sm mt-1">Adjust your rarity or grade to see your full set.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="glass p-4 border border-purple-400/30 flex flex-col gap-3 items-center"
            >
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Collection;
