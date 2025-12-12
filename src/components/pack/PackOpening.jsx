import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function PackOpening({ onComplete }) {
  const [phase, setPhase] = useState("tearing");

  useEffect(() => {
    if (phase === "tearing") {
      const timer = setTimeout(() => setPhase("light"), 800);
      return () => clearTimeout(timer);
    }

    if (phase === "light") {
      const timer = setTimeout(() => {
        setPhase("complete");
        onComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <AnimatePresence>
        {phase === "tearing" && (
          <motion.div
            className="relative w-72 h-96"
            initial={{ scale: 1, rotateY: 0 }}
            animate={{ scale: 1.1, rotateY: 15 }}
            exit={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div
              className="w-full h-full rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)",
                boxShadow: "0 0 40px rgba(168, 85, 247, 0.4)",
              }}
            >
              <motion.div
                className="absolute inset-0 bg-black origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, ease: "easeIn" }}
              />
            </div>
          </motion.div>
        )}

        {phase === "light" && (
          <>
            <motion.div
              className="absolute w-full h-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.2) 30%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
            </motion.div>

            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-96 origin-bottom"
                style={{
                  background: "linear-gradient(to top, rgba(168, 85, 247, 0.6), transparent)",
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${i * 45}deg)`,
                  filter: "blur(4px)",
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}

            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ["#a855f7", "#ec4899", "#06b6d4"][i % 3],
                  boxShadow: `0 0 10px ${["#a855f7", "#ec4899", "#06b6d4"][i % 3]}`,
                  left: "50%",
                  top: "50%",
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                }}
                transition={{ duration: 1.2, delay: Math.random() * 0.3, ease: "easeOut" }}
              />
            ))}

            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.4, times: [0, 0.3, 1] }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
