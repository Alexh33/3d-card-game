import { motion } from "framer-motion";

export function SealedPack({ onOpen, isOpening }) {
  return (
    <div className="relative flex items-center justify-center min-h-screen">
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, #a855f7 0%, #7c3aed 50%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative cursor-pointer"
        onClick={!isOpening ? onOpen : undefined}
        whileHover={!isOpening ? { scale: 1.05 } : {}}
        animate={
          isOpening
            ? { scale: [1, 1.1, 1.05], rotateY: [0, 5, -5, 0] }
            : { y: [0, -10, 0] }
        }
        transition={
          isOpening
            ? { duration: 0.6 }
            : {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      >
        <div
          className="relative w-72 h-96 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)",
            boxShadow: `
              0 0 40px rgba(168, 85, 247, 0.4),
              0 10px 40px rgba(0, 0, 0, 0.8),
              inset 0 1px 1px rgba(255, 255, 255, 0.2),
              inset 0 -1px 1px rgba(0, 0, 0, 0.8)
            `,
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(135deg, 
                  transparent 0%, 
                  rgba(168, 85, 247, 0.3) 25%, 
                  rgba(236, 72, 153, 0.3) 50%, 
                  rgba(6, 182, 212, 0.3) 75%, 
                  transparent 100%
                )
              `,
              backgroundSize: "200% 200%",
            }}
            animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.4) 0%, transparent 20%, transparent 80%, rgba(255,255,255,0.2) 100%)",
              mixBlendMode: "overlay",
            }}
          />

          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.3) 49%, rgba(0,0,0,0.3) 51%, transparent 52%),
                linear-gradient(-45deg, transparent 48%, rgba(0,0,0,0.3) 49%, rgba(0,0,0,0.3) 51%, transparent 52%)
              `,
              backgroundSize: "60px 60px",
              backgroundPosition: "0 0, 30px 30px",
            }}
          />

          <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
            <motion.div
              animate={{
                textShadow: [
                  "0 0 20px rgba(168, 85, 247, 0.5)",
                  "0 0 40px rgba(168, 85, 247, 0.8)",
                  "0 0 20px rgba(168, 85, 247, 0.5)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <h1
                className="text-center mb-4"
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "0.05em",
                }}
              >
                COLLECT THE
                <br />
                INTERNET
              </h1>
            </motion.div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-6" />

            <p className="text-center mb-8 text-purple-300/80 tracking-wide">PREMIUM BOOSTER PACK</p>

            <div
              className="px-6 py-3 rounded-full backdrop-blur-sm"
              style={{
                background: "rgba(168, 85, 247, 0.2)",
                border: "2px solid rgba(168, 85, 247, 0.5)",
                boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
              }}
            >
              <span className="tracking-widest" style={{ color: "#a855f7", fontSize: "0.9rem", fontWeight: 700 }}>
                5 CARDS
              </span>
            </div>

            {!isOpening && (
              <motion.p
                className="mt-8 text-purple-400/60 tracking-wide"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: "0.85rem" }}
              >
                CLICK TO OPEN
              </motion.p>
            )}
          </div>

          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: "inset 0 0 60px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.5)",
            }}
          />
        </div>

        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 20px rgba(168, 85, 247, 0.3)",
              "0 0 40px rgba(168, 85, 247, 0.6)",
              "0 0 20px rgba(168, 85, 247, 0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
