import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CoverCard } from "./CoverCard";
import { TradingCard } from "./TradingCard";
import { RARITY_CONFIG } from "../../data/packCards";

const RARITY_ORDER = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

export function CardReveal({ cards, onComplete, streamerMode = false }) {
  const sortedCards = useMemo(
    () =>
      [...cards].sort((a, b) => {
        const left = RARITY_ORDER[a.rarity?.toLowerCase?.()] || 0;
        const right = RARITY_ORDER[b.rarity?.toLowerCase?.()] || 0;
        return left - right;
      }),
    [cards]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showCover, setShowCover] = useState(streamerMode);

  const handleSwipeCard = () => {
    if (isSwiping || (streamerMode && showCover)) return;
    setIsSwiping(true);

    setTimeout(() => {
      if (currentIndex < sortedCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsSwiping(false);
        if (streamerMode) {
          setShowCover(true);
        }
      } else {
        onComplete();
      }
    }, 600);
  };

  const handleCoverReveal = () => setShowCover(false);

  if (currentIndex >= sortedCards.length) {
    return null;
  }

  const currentCard = sortedCards[currentIndex];
  const rarityKey = currentCard.rarity?.toLowerCase?.() || "common";
  const rarityConfig = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
  const isRare = rarityKey === "legendary" || rarityKey === "mythic";
  const isEpic = rarityKey === "epic";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <motion.div
        key={`bg-${currentIndex}`}
        className="absolute w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="w-full h-full"
          style={{ background: `radial-gradient(circle at center, ${rarityConfig.glow} 0%, transparent 70%)`, filter: "blur(80px)" }}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${currentIndex}`}
          className="relative cursor-pointer"
          onClick={handleSwipeCard}
          initial={{ scale: 0.8, opacity: 0, y: 50, rotateY: -20 }}
          animate={
            isSwiping
              ? { x: 800, y: -100, rotate: 45, opacity: 0, scale: 0.8 }
              : isRare
              ? { x: [0, -4, 4, -4, 4, 0], y: [0, 4, -4, 4, -4, 0], scale: 1, opacity: 1, rotateY: 0 }
              : { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0 }
          }
          transition={
            isSwiping
              ? { duration: 0.6, ease: "easeIn" }
              : isRare
              ? {
                  x: { duration: 0.5 },
                  y: { duration: 0.5 },
                  scale: { duration: 0.4 },
                  opacity: { duration: 0.4 },
                  rotateY: { duration: 0.4 },
                }
              : { duration: 0.4 }
          }
          whileHover={!isSwiping && !showCover ? { scale: 1.05 } : {}}
        >
          <TradingCard card={currentCard} />

          {showCover && <CoverCard onClose={handleCoverReveal} />}

          {(isRare || isEpic) && !isSwiping && !showCover && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.6, 0], scale: [1, 1.1, 1.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              style={{ boxShadow: `0 0 60px ${rarityConfig.glow}, 0 0 100px ${rarityConfig.glow}` }}
            />
          )}

          {isRare && !isSwiping && !showCover && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-xl pointer-events-none border-2"
                  style={{ borderColor: rarityConfig.color }}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: [0.6, 0], scale: [1, 1.5] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {!isSwiping &&
        [...Array(15)].map((_, i) => (
          <motion.div
            key={`dust-${currentIndex}-${i}`}
            className="absolute w-1 h-1 rounded-full pointer-events-none"
            style={{
              background: rarityConfig.color,
              boxShadow: `0 0 8px ${rarityConfig.color}`,
              left: "50%",
              top: "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 300 + Math.random() * 100,
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{ duration: 2, delay: Math.random() * 0.5, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }}
          />
        ))}

      <motion.div
        key={`label-${currentIndex}`}
        className="absolute top-20"
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={isSwiping ? { opacity: 0, y: -40 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="px-8 py-3 rounded-full backdrop-blur-sm"
          style={{
            background: `${rarityConfig.color}20`,
            border: `2px solid ${rarityConfig.color}`,
            boxShadow: `0 0 30px ${rarityConfig.glow}`,
          }}
        >
          <span
            className="uppercase tracking-widest"
            style={{ color: rarityConfig.color, fontSize: "1.2rem", fontWeight: 700, textShadow: `0 0 20px ${rarityConfig.glow}` }}
          >
            {rarityConfig.label}
          </span>
        </div>
      </motion.div>

      {!isSwiping && !showCover && (
        <motion.div
          className="absolute bottom-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0.6, 1, 0.6], y: 0 }}
          transition={{
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.5 },
          }}
        >
          <div className="text-center">
            <div className="text-purple-300/80 tracking-wide mb-2" style={{ fontSize: "1rem", fontWeight: 600 }}>
              CLICK TO REVEAL NEXT
            </div>
            <div className="text-purple-400/50" style={{ fontSize: "0.85rem" }}>
              {currentIndex + 1} / {cards.length}
            </div>
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex gap-2">
          {cards.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i < currentIndex ? "#8888a0" : i === currentIndex ? "#a855f7" : "#2a2a38",
                boxShadow: i === currentIndex ? "0 0 10px #a855f7" : "none",
                opacity: i < currentIndex ? 0.3 : 1,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
