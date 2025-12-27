import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CART_FILE = path.join(DATA_DIR, "carts.json");

// Atomic write helper
async function writeJSONAtomic(filePath, obj) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

async function readJSONSafe(filePath, fallback) {
  try {
    const s = await fs.readFile(filePath, "utf-8");
    return JSON.parse(s);
  } catch (e) {
    // create if missing / invalid
    await writeJSONAtomic(filePath, fallback);
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

export async function getAllCarts() {
  const db = await readJSONSafe(CART_FILE, { carts: {} });
  return db.carts || {};
}

export async function getConvo(phone) {
  const db = await readJSONSafe(CART_FILE, { carts: {} });
  db.carts ||= {};

  if (!db.carts[phone]) {
    db.carts[phone] = {
      phone,
      state: "NEW",
      context: { cart: {} },
      updatedAt: nowISO()
    };
    await writeJSONAtomic(CART_FILE, db);
  }

  return db.carts[phone];
}

export async function saveConvo(phone, convo) {
  const db = await readJSONSafe(CART_FILE, { carts: {} });
  db.carts ||= {};
  db.carts[phone] = { ...convo, phone, updatedAt: nowISO() };
  await writeJSONAtomic(CART_FILE, db);
  return db.carts[phone];
}

export async function clearCart(phone) {
  const convo = await getConvo(phone);
  convo.context ||= {};
  convo.context.cart = {};
  convo.context.selectedItem = null;
  convo.context.selectedCategoryId = null;
  convo.state = "CATEGORY";
  return await saveConvo(phone, convo);
}

export async function removeItem(phone, itemId) {
  const convo = await getConvo(phone);
  convo.context ||= {};
  convo.context.cart ||= {};
  delete convo.context.cart[itemId];
  return await saveConvo(phone, convo);
}

export async function updateQty(phone, itemId, qty) {
  const convo = await getConvo(phone);
  convo.context ||= {};
  convo.context.cart ||= {};

  if (!convo.context.cart[itemId]) return convo;

  if (qty <= 0) delete convo.context.cart[itemId];
  else convo.context.cart[itemId].qty = qty;

  return await saveConvo(phone, convo);
}

export function calculateTotal(cartObj = {}) {
  return Object.values(cartObj).reduce((sum, line) => sum + (line.price * line.qty), 0);
}
