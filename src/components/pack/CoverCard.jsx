import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";

export function CoverCard({ onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useTransform(x, [0, 200], [1, 0]);

  const handleDragEnd = (_event, info) => {
    setIsDragging(false);
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (distance > 150) {
      onClose();
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      style={{ x, y, opacity, zIndex: 10 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
    >
      <div
        className="w-full h-full rounded-xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #0a0a0f 50%, #1a0a2e 100%)",
          boxShadow: "0 0 40px rgba(168, 85, 247, 0.5), inset 0 0 60px rgba(168, 85, 247, 0.1)",
          border: "2px solid rgba(168, 85, 247, 0.5)",
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="tracking-widest mb-4"
              style={{
                fontSize: "3rem",
                fontWeight: 900,
                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 40px rgba(168, 85, 247, 0.8)",
                filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))",
              }}
            >
              CTN
            </div>
            <div
              className="tracking-[0.3em] text-center"
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#a855f7",
                textShadow: "0 0 10px rgba(168, 85, 247, 0.8)",
                letterSpacing: "0.3em",
              }}
            >
              COLLECT THE NET
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)",
              backgroundSize: "200% 200%",
            }}
            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="mt-8"
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(168, 85, 247, 0.2)",
                border: "3px solid rgba(168, 85, 247, 0.6)",
                boxShadow:
                  "0 0 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "3rem",
                  fontWeight: 700,
                  color: "#a855f7",
                  textShadow: "0 0 20px rgba(168, 85, 247, 0.8)",
                }}
              >
                ?
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{
            opacity: isDragging ? 0 : [0.5, 1, 0.5],
            y: isDragging ? 10 : [0, -5, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="text-center">
            <div className="text-purple-300/80 tracking-wide" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              DRAG TO REVEAL
            </div>
            <div className="flex gap-2 justify-center mt-2">
              {[0, 0.2, 0.4].map((delay) => (
                <motion.div
                  key={delay}
                  className="w-2 h-2 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {[
          { top: "8px", left: "8px", rotate: "0deg" },
          { top: "8px", right: "8px", rotate: "90deg" },
          { bottom: "8px", right: "8px", rotate: "180deg" },
          { bottom: "8px", left: "8px", rotate: "270deg" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-6 h-6"
            style={{
              ...pos,
              borderTop: "3px solid rgba(168, 85, 247, 0.8)",
              borderLeft: "3px solid rgba(168, 85, 247, 0.8)",
              transform: `rotate(${pos.rotate})`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
