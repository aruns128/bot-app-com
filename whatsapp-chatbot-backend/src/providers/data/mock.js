const CATEGORIES = [
  { id: "cakes", name: "Cakes 🎂" },
  { id: "bread", name: "Bread 🍞" },
  { id: "pastry", name: "Pastries 🧁" }
];

const ITEMS_BY_CATEGORY = {
  cakes: [
    { id: "cake_choco", name: "Chocolate Cake", price: 500 },
    { id: "cake_vanilla", name: "Vanilla Cake", price: 450 }
  ],
  bread: [
    { id: "bread_white", name: "White Bread", price: 60 },
    { id: "bread_brown", name: "Brown Bread", price: 70 }
  ],
  pastry: [
    { id: "pastry_croissant", name: "Croissant", price: 80 },
    { id: "pastry_muffin", name: "Muffin", price: 90 }
  ]
};

export async function getCategories() {
  return CATEGORIES;
}

export async function getItemsByCategory(categoryId) {
  return ITEMS_BY_CATEGORY[categoryId] || [];
}

export async function getItemById(itemId) {
  for (const categoryId of Object.keys(ITEMS_BY_CATEGORY)) {
    const found = (ITEMS_BY_CATEGORY[categoryId] || []).find((x) => x.id === itemId);
    if (found) return found;
  }
  return null;
}
