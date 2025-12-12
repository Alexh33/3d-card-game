import { v4 as uuidv4 } from "uuid";

export const RARITY_CONFIG = {
  common: {
    color: "#8888a0",
    glow: "rgba(136, 136, 160, 0.3)",
    label: "Common",
    dropRate: 0.5,
  },
  rare: {
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.5)",
    label: "Rare",
    dropRate: 0.3,
  },
  epic: {
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.6)",
    label: "Epic",
    dropRate: 0.15,
  },
  legendary: {
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.7)",
    label: "Legendary",
    dropRate: 0.04,
  },
  mythic: {
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.8)",
    label: "Mythic",
    dropRate: 0.01,
  },
};

export const CARD_POOL = [
  // Mythic Cards
  {
    id: "mythic-1",
    name: "Doge Eternal",
    description: "The original. The legend. Much wow, very rare.",
    image: "https://images.unsplash.com/photo-1636196737876-43a0e9d73a62?w=400&h=600&fit=crop",
    rarity: "mythic",
    clarityIndex: 98,
    category: "Classic Meme",
  },
  {
    id: "mythic-2",
    name: "Wojak Ascended",
    description: "When feels transcend reality.",
    image: "https://images.unsplash.com/photo-1618004652321-13a63e576b80?w=400&h=600&fit=crop",
    rarity: "mythic",
    clarityIndex: 95,
    category: "Art Wojak",
  },

  // Legendary Cards
  {
    id: "legendary-1",
    name: "Pepe Platinum",
    description: "Rare Pepe from the golden age.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop",
    rarity: "legendary",
    clarityIndex: 92,
    category: "Rare Pepe",
  },
  {
    id: "legendary-2",
    name: "Stonks CEO",
    description: "Only goes up. Guaranteed.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    rarity: "legendary",
    clarityIndex: 88,
    category: "Finance Meme",
  },
  {
    id: "legendary-3",
    name: "Galaxy Brain",
    description: "Expanding consciousness, infinite IQ.",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop",
    rarity: "legendary",
    clarityIndex: 85,
    category: "Big Brain",
  },

  // Epic Cards
  {
    id: "epic-1",
    name: "Distracted Boyfriend HD",
    description: "The look that started it all.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
    rarity: "epic",
    clarityIndex: 80,
    category: "Stock Photo Meme",
  },
  {
    id: "epic-2",
    name: "Gigachad",
    description: "Average internet enjoyer.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
    rarity: "epic",
    clarityIndex: 76,
    category: "Chad",
  },
  {
    id: "epic-3",
    name: "Disaster Girl",
    description: "Some people just want to watch the world burn.",
    image: "https://images.unsplash.com/photo-1595956968246-d8a001e5f93a?w=400&h=600&fit=crop",
    rarity: "epic",
    clarityIndex: 72,
    category: "Classic",
  },
  {
    id: "epic-4",
    name: "This Is Fine",
    description: "Everything is perfectly normal.",
    image: "https://images.unsplash.com/photo-1542909168-82c3e7fdca44?w=400&h=600&fit=crop",
    rarity: "epic",
    clarityIndex: 68,
    category: "Relatable",
  },

  // Rare Cards
  {
    id: "rare-1",
    name: "Drake Pointing",
    description: "Nah / Yeah energy.",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop",
    rarity: "rare",
    clarityIndex: 65,
    category: "Music",
  },
  {
    id: "rare-2",
    name: "Woman Yelling at Cat",
    description: "The great debate.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
    rarity: "rare",
    clarityIndex: 60,
    category: "Animals",
  },
  {
    id: "rare-3",
    name: "Salt Bae",
    description: "Sprinkle with style.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop",
    rarity: "rare",
    clarityIndex: 58,
    category: "Celebrity",
  },
  {
    id: "rare-4",
    name: "Surprised Pikachu",
    description: ":O",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=600&fit=crop",
    rarity: "rare",
    clarityIndex: 55,
    category: "Reaction",
  },
  {
    id: "rare-5",
    name: "Hide the Pain Harold",
    description: "Smile through the suffering.",
    image: "https://images.unsplash.com/photo-1531251445707-1f000e1e87d0?w=400&h=600&fit=crop",
    rarity: "rare",
    clarityIndex: 52,
    category: "Stock Photo",
  },

  // Common Cards
  {
    id: "common-1",
    name: "Keyboard Warrior",
    description: "Actually, let me educate you...",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 48,
    category: "Tech",
  },
  {
    id: "common-2",
    name: "Coffee Addict",
    description: "But first, coffee.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 45,
    category: "Lifestyle",
  },
  {
    id: "common-3",
    name: "Zoom Meeting Survivor",
    description: "You're on mute.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 42,
    category: "Work",
  },
  {
    id: "common-4",
    name: "Overthinking",
    description: 'But what did they mean by "ok"?',
    image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 38,
    category: "Relatable",
  },
  {
    id: "common-5",
    name: "Monday Mood",
    description: "Not like this...",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 35,
    category: "Mood",
  },
  {
    id: "common-6",
    name: "Algorithm Slave",
    description: "Please engage with my content.",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 32,
    category: "Social Media",
  },
  {
    id: "common-7",
    name: "Touch Grass",
    description: "Go outside they said...",
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 28,
    category: "Advice",
  },
  {
    id: "common-8",
    name: "Reply Guy",
    description: "Well actually...",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop",
    rarity: "common",
    clarityIndex: 25,
    category: "Social Media",
  },
];

const RARITY_WEIGHTS = [
  { rarity: "mythic", weight: 0.01 },
  { rarity: "legendary", weight: 0.04 },
  { rarity: "epic", weight: 0.15 },
  { rarity: "rare", weight: 0.3 },
  { rarity: "common", weight: 0.5 },
];

const RARITY_ORDER = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };

export function generateRandomPack(count = 5) {
  const pack = [];

  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    let selectedRarity = "common";
    let cumulative = 0;

    for (const { rarity, weight } of RARITY_WEIGHTS) {
      cumulative += weight;
      if (roll <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    const cardsOfRarity = CARD_POOL.filter((card) => card.rarity === selectedRarity);
    const template = cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)];
    const clarityVariation = Math.floor(Math.random() * 20) - 10;

    pack.push({
      ...template,
      id: `${template.id}-${uuidv4()}`,
      clarityIndex: Math.max(0, Math.min(100, template.clarityIndex + clarityVariation)),
    });
  }

  return pack.sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));
}
