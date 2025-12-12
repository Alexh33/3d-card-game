import { RARITY_CONFIG } from "../../data/packCards";

export function TradingCard({ card, className = "" }) {
  const rarityKey = card.rarity?.toLowerCase?.() || "common";
  const rarityConfig = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
  const clarityFactor = (card.clarityIndex ?? 0) / 100;
  const grainOpacity = (1 - clarityFactor) * 0.4;
  const saturation = 100 - (1 - clarityFactor) * 30;
  const brightness = 100 - (1 - clarityFactor) * 20;

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative w-64 h-96 rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          boxShadow: `
            0 0 20px ${rarityConfig.glow},
            0 4px 20px rgba(0,0,0,0.5),
            inset 0 1px 1px rgba(255,255,255,0.1),
            inset 0 -1px 1px rgba(0,0,0,0.5)
          `,
        }}
      >
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.08) 100%)",
            mixBlendMode: "overlay",
          }}
        />

        <div
          className="absolute inset-0 z-10 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${rarityConfig.color}40 0%, transparent 30%, transparent 70%, ${rarityConfig.color}20 100%)`,
            opacity: 0.3,
          }}
        />

        <div className="absolute inset-0 bg-[#12121a]">
          <div className="relative h-3/5 overflow-hidden">
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover"
                style={{
                  filter: `saturate(${saturation}%) brightness(${brightness}%)`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-white/60">
                No art yet
              </div>
            )}

            {grainOpacity > 0.1 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: grainOpacity,
                  backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px),
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)
                  `,
                  backgroundSize: "4px 4px",
                  mixBlendMode: "multiply",
                }}
              />
            )}

            <div
              className="absolute top-3 right-3 px-3 py-1 rounded-full backdrop-blur-sm"
              style={{
                background: `${rarityConfig.color}30`,
                border: `1px solid ${rarityConfig.color}`,
                boxShadow: `0 0 10px ${rarityConfig.glow}`,
              }}
            >
              <span className="uppercase tracking-wider" style={{ color: rarityConfig.color, fontSize: "0.7rem", fontWeight: 700 }}>
                {rarityConfig.label}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/20">
              <span className="tracking-wider" style={{ color: "#e8e8f0", fontSize: "0.65rem", fontWeight: 600 }}>
                CLARITY {card.clarityIndex}
              </span>
            </div>
          </div>

          <div className="relative h-2/5 p-4 flex flex-col justify-between">
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${rarityConfig.color}, transparent)` }}
            />

            <div>
              <h3 className="mb-1" style={{ color: rarityConfig.color, fontSize: "1.1rem", fontWeight: 700 }}>
                {card.name}
              </h3>
              <p className="mb-2 opacity-70" style={{ fontSize: "0.75rem", color: "#e8e8f0" }}>
                {card.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10" style={{ fontSize: "0.65rem", color: "#8888a0" }}>
                {card.category}
              </span>
              <span
                className="opacity-40"
                style={{ fontSize: "0.6rem", color: "#8888a0", fontFamily: "monospace" }}
              >
                #{(card.id || "").slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
