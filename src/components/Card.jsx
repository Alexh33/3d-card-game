import { motion } from "framer-motion";

export default function Card({ card }) {
  const rarityColors = {
    Common: "border-gray-600",
    Rare: "border-blue-500",
    Legendary: "border-purple-500 shadow-lg animate-pulse",
    Mythic: "border-yellow-400 shadow-lg animate-pulse",
  };

  return (
    <motion.div
      className={`bg-[#25003A] p-4 rounded-2xl shadow-lg border-4 ${
        rarityColors[card.rarity] || "border-gray-700"
      }`}
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <img
        src={card.image}
        alt={card.name}
        className="w-full h-48 object-cover rounded-xl border border-yellow-300 mb-4"
      />
      <h3 className="font-bold text-lg text-yellow-300">{card.name}</h3>
      <p className="text-sm text-gray-400">{card.grade}</p>
      <p className="text-xs text-gray-500">Float: {card.float}</p>
    </motion.div>
  );
}
