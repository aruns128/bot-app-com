import { Router } from "express";
import { getAllCarts, getConvo, clearCart, removeItem, updateQty } from "../../core/cartFileStore.js";

export const cartRoutes = Router();

// Get cart for a phone
cartRoutes.get("/cart/:phone", async (req, res) => {
  const convo = await getConvo(req.params.phone);
  res.json(convo);
});

// Get all carts
cartRoutes.get("/carts", async (req, res) => {
  const carts = await getAllCarts();
  res.json({ carts });
});

// Clear cart
cartRoutes.post("/cart/:phone/clear", async (req, res) => {
  const convo = await clearCart(req.params.phone);
  res.json(convo);
});

// Remove item
cartRoutes.post("/cart/:phone/remove", async (req, res) => {
  const { itemId } = req.body;
  const convo = await removeItem(req.params.phone, itemId);
  res.json(convo);
});

// Update qty
cartRoutes.post("/cart/:phone/qty", async (req, res) => {
  const { itemId, qty } = req.body;
  const convo = await updateQty(req.params.phone, itemId, Number(qty));
  res.json(convo);
});
