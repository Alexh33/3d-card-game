const ADJECTIVES = [
  "Spicy",
  "Crispy",
  "Fresh",
  "Zesty",
  "Savory",
  "Bold",
  "Bright",
  "Wild",
  "Cool",
  "Brave",
];

const VEGGIES = [
  "Carrot",
  "Tomato",
  "Pepper",
  "Broccoli",
  "Spinach",
  "Radish",
  "Bean",
  "Pea",
  "Kale",
  "Cabbage",
];

export function generateHandleFromId(id, includeSuffix = true) {
  if (!id) return "Collector";
  const sum = String(id)
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const adj = ADJECTIVES[sum % ADJECTIVES.length];
  const veg = VEGGIES[(sum >> 3) % VEGGIES.length];
  const suffix = includeSuffix ? `-${String(id).slice(0, 4)}` : "";
  return `${adj}${veg}${suffix}`;
}

export function resolveHandle(username, id) {
  return username?.trim() || generateHandleFromId(id);
}
