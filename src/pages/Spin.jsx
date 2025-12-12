import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CARD_POOL, RARITY_CONFIG } from "../data/packCards";
import { supabase } from "../supabaseClient";

const CARD_WIDTH = 148; // 128px art + padding/margin
const TRACK_WIDTH = 760; // matches max-w below
const INSERT_AT = 110; // position to land on

const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const rarityWeights = Object.entries(RARITY_CONFIG).map(([rarity, config]) => ({
  rarity,
  weight: config.dropRate,
}));

function Spin() {
  const [user, setUser] = useState(null);
  const [canSpin, setCanSpin] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [beltCards, setBeltCards] = useState([]);
  const [error, setError] = useState("");
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: authedUser },
      } = await supabase.auth.getUser();
      if (!authedUser) {
        navigate("/login");
        return;
      }
      setUser(authedUser);

      const lastSpin = localStorage.getItem("lastSpinAt");
      if (lastSpin) {
        const last = new Date(lastSpin);
        const now = new Date();
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          setCanSpin(false);
        }
      }
    };
    init();
  }, [navigate]);

  const weightedRarity = () => {
    const total = rarityWeights.reduce((sum, entry) => sum + entry.weight, 0);
    const roll = Math.random() * total;
    let cumulative = 0;
    for (const entry of rarityWeights) {
      cumulative += entry.weight;
      if (roll <= cumulative) return entry.rarity;
    }
    return "common";
  };

  const pickCard = () => {
    const rarity = weightedRarity();
    const pool = CARD_POOL.filter((card) => card.rarity === rarity);
    const template = pool[Math.floor(Math.random() * pool.length)];
    const clarityVariation = Math.floor(Math.random() * 18) - 8;
    return {
      ...template,
      rarity,
      clarityIndex: Math.max(0, Math.min(100, (template.clarityIndex ?? 60) + clarityVariation)),
    };
  };

  const startSpin = () => {
    if (!canSpin || spinning) return;
    setError("");
    setSpinning(true);
    setSelectedCard(null);

    const winningCard = pickCard();
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? TRACK_WIDTH;
    if (containerRef.current) {
      containerRef.current.style.transform = "translateX(0px)";
    }

    const generated = [];
    for (let i = 0; i < 160; i += 1) {
      generated.push(pickCard());
    }
    generated.splice(INSERT_AT, 0, winningCard);
    setBeltCards(generated);

    setTimeout(() => {
      const randomWithinCard = Math.random() * CARD_WIDTH - CARD_WIDTH / 2;
      const finalOffset = -(INSERT_AT * CARD_WIDTH) + containerWidth / 2 + randomWithinCard;
      const durationMs = 4200;

      if (containerRef.current) {
        const node = containerRef.current;
        node.style.transition = "none";
        node.style.transform = "translateX(0px)";
        // Double RAF ensures the browser applies the reset before animating.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            node.style.transition = `transform ${durationMs}ms cubic-bezier(0.19, 1, 0.22, 1)`;
            node.style.transform = `translateX(${finalOffset}px)`;
          });
        });
      }

      setTimeout(async () => {
        const success = await awardCard(winningCard);
        if (success) {
          setSelectedCard(winningCard);
          localStorage.setItem("lastSpinAt", new Date().toISOString());
          setCanSpin(false);
        }
        setSpinning(false);
      }, durationMs + 300);
    }, 400);
  };

  const awardCard = async (card) => {
    if (!user) return false;
    const payload = {
      owner_id: user.id,
      name: card.name,
      image: card.image,
      rarity: capitalize(card.rarity),
      description: card.description,
      clarity_index: card.clarityIndex ?? Math.floor(Math.random() * 100),
    };

    const { error: insertError } = await supabase.from("cards").insert(payload);
    if (insertError) {
      console.error("Failed to award card:", insertError);
      setError(insertError.message || "Could not save the card. Try again in a bit.");
      return false;
    }
    return true;
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.15),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_40%),radial-gradient(circle_at_50%_70%,rgba(59,130,246,0.12),transparent_45%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_45%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        <div className="glass p-6 border border-purple-500/25">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="pill mb-2">Daily reward</p>
              <h1 className="text-3xl font-bold leading-tight">Spin the neon belt, keep the pull.</h1>
              <p className="text-white/70 mt-2 max-w-2xl">
                Weighted odds from the live drop table. When the cursor lands on your card, we mint it straight
                into your collection.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Status</p>
              <p className="text-xl font-semibold">
                {spinning ? "Spinning..." : canSpin ? "Ready" : "Next spin in 24h"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5 text-sm">
            {Object.entries(RARITY_CONFIG).map(([rarity, config]) => (
              <div
                key={rarity}
                className="px-3 py-2 rounded-lg backdrop-blur-sm border"
                style={{
                  borderColor: `${config.color}40`,
                  background: `${config.color}10`,
                  color: config.color,
                }}
              >
                {config.label} · {Math.round(config.dropRate * 100)}%
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={startSpin}
            disabled={!canSpin || spinning}
            className="cta px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {spinning ? "Spinning..." : canSpin ? "Spin for a Free Card" : "Come back tomorrow"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="relative overflow-hidden w-full max-w-5xl mx-auto mt-4 h-48 rounded-2xl bg-[#0c0b18] border border-purple-400/30 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2),transparent_55%)] pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 transform -translate-x-1/2 z-20 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />

          <div className="absolute inset-0 overflow-hidden">
            <div
              ref={containerRef}
              className="flex items-center gap-3 transition-transform will-change-transform"
              style={{ transform: "translateX(0px)" }}
            >
              {beltCards.map((card, idx) => {
                const rarityKey = card.rarity?.toLowerCase?.() || "common";
                const rarityConfig = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
                return (
                  <div
                    key={`${card.id}-${idx}`}
                    className="w-36 h-40 flex-shrink-0 rounded-xl p-3 backdrop-blur-sm border shadow-lg transform-gpu"
                    style={{
                      borderColor: `${rarityConfig.color}50`,
                      background: "rgba(255,255,255,0.02)",
                      boxShadow: `0 0 18px ${rarityConfig.glow}`,
                    }}
                  >
                    <div className="h-24 w-full rounded-lg overflow-hidden mb-2 bg-black/40">
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2">{card.name}</p>
                    <p className="text-[10px] text-white/60">{RARITY_CONFIG[rarityKey]?.label || "Common"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedCard && !spinning && (
          <div className="glass p-6 border border-green-400/40 text-center">
            <p className="pill mb-3" style={{ background: "rgba(74, 222, 128, 0.2)", color: "#4ade80" }}>
              Winner
            </p>
            <h2 className="text-2xl font-bold text-green-300">
              🎉 You pulled {selectedCard.name} ({capitalize(selectedCard.rarity)})
            </h2>
            <p className="text-white/70 mt-2 max-w-2xl mx-auto">{selectedCard.description}</p>
            <div className="mt-4 flex justify-center">
              <img
                src={selectedCard.image}
                alt={selectedCard.name}
                className="w-48 h-64 object-cover rounded-xl border border-green-400/40 shadow-lg"
              />
            </div>
            <div className="flex justify-center gap-3 mt-4 text-sm text-white/70">
              <span className="px-3 py-2 rounded-lg border border-white/10 bg-white/5">
                Clarity {selectedCard.clarityIndex}
              </span>
              <span
                className="px-3 py-2 rounded-lg border"
                style={{ borderColor: `${(RARITY_CONFIG[selectedCard.rarity] || RARITY_CONFIG.common).color}60` }}
              >
                {(RARITY_CONFIG[selectedCard.rarity]?.label ?? capitalize(selectedCard.rarity)) || "Card"}
              </span>
            </div>
            <button
              onClick={() => navigate("/collection")}
              className="cta mt-5 px-6 py-3"
            >
              View Collection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Spin;
