import { motion } from "framer-motion";
import { TradingCard } from "./TradingCard";
import { RARITY_CONFIG } from "../../data/packCards";

export function PackResults({ cards, onOpenAnother }) {
  if (!cards?.length) {
    return null;
  }

  const rarityOrder = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
  const bestCard = cards.reduce((best, card) => {
    const bestScore = rarityOrder[best.rarity?.toLowerCase?.()] || 0;
    const score = rarityOrder[card.rarity?.toLowerCase?.()] || 0;
    return score > bestScore ? card : best;
  }, cards[0]);

  const bestRarityKey = bestCard.rarity?.toLowerCase?.() || "common";
  const bestConfig = RARITY_CONFIG[bestRarityKey] || RARITY_CONFIG.common;

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      <motion.div className="text-center mb-12" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h2
          className="mb-2"
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          YOUR PULL
        </h2>
        <p className="text-purple-300/60 tracking-wide">{cards.length} cards collected</p>
      </motion.div>

      <motion.div className="max-w-6xl mx-auto mb-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="text-center mb-6">
          <div
            className="inline-block px-6 py-2 rounded-full backdrop-blur-sm mb-4"
            style={{
              background: `${bestConfig.color}20`,
              border: `2px solid ${bestConfig.color}`,
              boxShadow: `0 0 20px ${bestConfig.glow}`,
            }}
          >
            <span className="uppercase tracking-widest" style={{ color: bestConfig.color, fontSize: "0.9rem", fontWeight: 700 }}>
              ★ BEST PULL
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <TradingCard card={bestCard} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="max-w-6xl mx-auto mb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}>
        <h3 className="text-center mb-6 text-purple-300/80 tracking-wide">COMPLETE LINEUP</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 justify-items-center">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              className="transform-gpu"
            >
              <TradingCard card={card} className="scale-75" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="max-w-2xl mx-auto mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }}>
        <h3 className="text-center mb-6 text-purple-300/80 tracking-wide">RARITY BREAKDOWN</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(RARITY_CONFIG).map(([rarity, config]) => {
            const count = cards.filter((card) => (card.rarity || "").toLowerCase() === rarity).length;
            return (
              <div
                key={rarity}
                className="text-center p-4 rounded-lg backdrop-blur-sm"
                style={{
                  background: count > 0 ? `${config.color}15` : "#1a1a24",
                  border: `1px solid ${count > 0 ? config.color : "#2a2a38"}`,
                  boxShadow: count > 0 ? `0 0 15px ${config.glow}` : "none",
                }}
              >
                <div className="mb-1" style={{ fontSize: "1.5rem", fontWeight: 700, color: count > 0 ? config.color : "#8888a0" }}>
                  {count}
                </div>
                <div
                  className="uppercase tracking-wide"
                  style={{
                    fontSize: "0.7rem",
                    color: count > 0 ? config.color : "#8888a0",
                    opacity: count > 0 ? 1 : 0.5,
                  }}
                >
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.2 }}>
        <button
          onClick={onOpenAnother}
          className="px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
            boxShadow: "0 0 30px rgba(168, 85, 247, 0.4), 0 4px 20px rgba(0, 0, 0, 0.5)",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "0.05em",
            border: "none",
            cursor: "pointer",
          }}
        >
          OPEN ANOTHER PACK
        </button>
        <p className="mt-4 text-purple-300/40 tracking-wide" style={{ fontSize: "0.85rem" }}>
          The grind never stops
        </p>
      </motion.div>
    </div>
  );
}
