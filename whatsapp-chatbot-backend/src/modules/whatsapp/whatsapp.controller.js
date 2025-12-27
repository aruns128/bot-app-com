import { asyncHandler } from "../../core/asyncHandler.js";
import { whatsapp } from "../../providers/whatsapp/index.js";
import { data } from "../../providers/data/index.js";
import { payment } from "../../providers/payment/index.js";
import {
  getConvo as getFileConvo,
  saveConvo as saveFileConvo,
} from "../../core/cartFileStore.js";

import { Conversation } from "../../models/Conversation.js"; // used only if Mongo exists

// ---------------- UI builders ----------------

function buildCategoryList(categories) {
  return {
    type: "list",
    header: { type: "text", text: "🍰 Categories" },
    body: { text: "Please select a category" },
    action: {
      button: "View Categories",
      sections: [
        {
          title: "Bakery Items",
          rows: categories.map((c) => ({ id: `cat:${c.id}`, title: c.name })),
        },
      ],
    },
  };
}

function buildItemsList(categoryId, items) {
  return {
    type: "list",
    header: { type: "text", text: "🧺 Items" },
    body: { text: "Select an item" },
    action: {
      button: "View Items",
      sections: [
        {
          title: `Category: ${categoryId}`,
          rows: items.map((i) => ({
            id: `item:${i.id}`,
            title: i.name,
            description: `₹${i.price}`,
          })),
        },
      ],
    },
  };
}

function buildQtyList(itemName) {
  const quantities = [1, 2, 3, 4, 5];
  return {
    type: "list",
    header: { type: "text", text: "➕ Quantity" },
    body: { text: `Select quantity for: ${itemName}` },
    action: {
      button: "Choose Qty",
      sections: [
        {
          title: "Quantity",
          rows: quantities.map((q) => ({ id: `qty:${q}`, title: `${q}` })),
        },
      ],
    },
  };
}

function buildCartButtons(total) {
  return {
    type: "button",
    body: { text: `🛒 Cart updated!\nCurrent total: ₹${total}\nWhat next?` },
    action: {
      buttons: [
        { type: "reply", reply: { id: "cart:add_more", title: "Add more" } },
        { type: "reply", reply: { id: "cart:checkout", title: "Checkout" } },
      ],
    },
  };
}

function buildAddressConfirmButtons(address) {
  return {
    type: "button",
    body: {
      text:
        `📦 Delivery Address\n` +
        `House: ${address.house}\n` +
        `Street: ${address.street}\n` +
        `Pincode: ${address.pincode}\n\n` +
        `Confirm this address?`,
    },
    action: {
      buttons: [
        { type: "reply", reply: { id: "addr:confirm", title: "✅ Confirm" } },
        { type: "reply", reply: { id: "addr:edit_house", title: "✏️ Edit House" } },
        { type: "reply", reply: { id: "addr:edit_street", title: "✏️ Edit Street" } },
        { type: "reply", reply: { id: "addr:edit_pincode", title: "✏️ Edit Pincode" } },
      ],
    },
  };
}

// ---------------- helpers ----------------

function calculateTotal(cartMap) {
  return Object.values(cartMap).reduce(
    (sum, line) => sum + (Number(line.price) || 0) * (Number(line.qty) || 0),
    0
  );
}

function isValidPincode(pin) {
  return /^[0-9]{6}$/.test(pin);
}

function getInteractiveId(msg) {
  const interactive = msg?.interactive;
  if (!interactive) return null;
  if (interactive.type === "list_reply") return interactive.list_reply?.id || null;
  if (interactive.type === "button_reply") return interactive.button_reply?.id || null;
  return null;
}

async function loadConversation(phone) {
  // Mongo if configured
  if (process.env.MONGO_URI) {
    let convo = await Conversation.findOne({ phone });
    if (!convo) {
      convo = await Conversation.create({
        phone,
        state: "NEW",
        context: { cart: {} },
      });
    }
    convo.context ||= {};
    convo.context.cart ||= {};
    return { type: "mongo", convo };
  }

  // File-based simulator
  const convo = await getFileConvo(phone);
  convo.context ||= {};
  convo.context.cart ||= {};
  return { type: "file", convo };
}

async function saveConversation(storeType, convo) {
  if (storeType === "mongo") {
    convo.markModified("context");
    await convo.save();
    return;
  }
  await saveFileConvo(convo.phone, convo);
}

/**
 * Shared processor used by:
 * - real webhook
 * - simulator endpoint
 */
export async function processWebhookBody(body) {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return { ok: true, reason: "no_message" };

  const phone = msg.from;
  const text = msg.text?.body?.trim(); // keep original case for address, etc.
  const textLower = text?.toLowerCase();
  const interactiveId = getInteractiveId(msg);

  const { type: storeType, convo } = await loadConversation(phone);

  // 1) NEW -> CATEGORY
  if (convo.state === "NEW" && textLower === "hi") {
    const categories = await data.getCategories();
    await whatsapp.sendText(phone, "👋 Welcome to our Bakery!");
    await whatsapp.sendList(phone, buildCategoryList(categories));

    convo.state = "CATEGORY";
    await saveConversation(storeType, convo);
    return { ok: true, action: "sent_categories", storeType };
  }

  // 2) CATEGORY -> ITEM
  if (convo.state === "CATEGORY" && interactiveId?.startsWith("cat:")) {
    const categoryId = interactiveId.split(":")[1];
    const items = await data.getItemsByCategory(categoryId);

    convo.context.selectedCategoryId = categoryId;
    convo.state = "ITEM";
    await saveConversation(storeType, convo);

    await whatsapp.sendList(phone, buildItemsList(categoryId, items));
    return { ok: true, action: "sent_items", categoryId, storeType };
  }

  // 3) ITEM -> QTY
  if (convo.state === "ITEM" && interactiveId?.startsWith("item:")) {
    const itemId = interactiveId.split(":")[1];
    const item = await data.getItemById(itemId);

    if (!item) return { ok: true, action: "item_not_found", storeType };

    convo.context.selectedItem = item;
    convo.state = "QTY";
    await saveConversation(storeType, convo);

    await whatsapp.sendList(phone, buildQtyList(item.name));
    return { ok: true, action: "ask_qty", itemId, storeType };
  }

  // 4) QTY -> CART
  if (convo.state === "QTY" && interactiveId?.startsWith("qty:")) {
    const qty = Number(interactiveId.split(":")[1]);
    const item = convo.context.selectedItem;

    if (!item || !qty || qty <= 0) return { ok: true, action: "invalid_qty", storeType };

    const cart = convo.context.cart || {};
    if (cart[item.id]) cart[item.id].qty += qty;
    else {
      cart[item.id] = { itemId: item.id, name: item.name, price: item.price, qty };
    }

    convo.context.cart = cart;
    convo.context.selectedItem = null;

    const total = calculateTotal(cart);

    convo.state = "CART";
    await saveConversation(storeType, convo);

    await whatsapp.sendButtons(phone, buildCartButtons(total));
    return { ok: true, action: "cart_updated", total, storeType };
  }

  // 5) CART actions
  if (convo.state === "CART" && interactiveId === "cart:add_more") {
    const categories = await data.getCategories();
    convo.state = "CATEGORY";
    await saveConversation(storeType, convo);

    await whatsapp.sendList(phone, buildCategoryList(categories));
    return { ok: true, action: "add_more", storeType };
  }

  if (convo.state === "CART" && interactiveId === "cart:checkout") {
    const total = calculateTotal(convo.context.cart || {});
    convo.context.total = total;

    convo.context.address = { house: "", street: "", pincode: "" };
    convo.state = "ADDRESS_HOUSE";
    await saveConversation(storeType, convo);

    await whatsapp.sendText(
      phone,
      `✅ Checkout started.\nTotal: ₹${total}\n\n🏠 Please enter your House No / Flat No:`
    );

    return { ok: true, action: "ask_house", total, storeType };
  }

  // 6) ADDRESS flow (text)
  if (convo.state === "ADDRESS_HOUSE" && text) {
    convo.context.address ||= { house: "", street: "", pincode: "" };
    convo.context.address.house = text;

    convo.state = "ADDRESS_STREET";
    await saveConversation(storeType, convo);

    await whatsapp.sendText(phone, "🛣️ Please enter your Street / Area:");
    return { ok: true, action: "ask_street", storeType };
  }

  if (convo.state === "ADDRESS_STREET" && text) {
    convo.context.address ||= { house: "", street: "", pincode: "" };
    convo.context.address.street = text;

    convo.state = "ADDRESS_PINCODE";
    await saveConversation(storeType, convo);

    await whatsapp.sendText(phone, "📮 Please enter your 6-digit Pincode:");
    return { ok: true, action: "ask_pincode", storeType };
  }

  if (convo.state === "ADDRESS_PINCODE" && text) {
    const pin = text.replace(/\s+/g, "");
    if (!isValidPincode(pin)) {
      await whatsapp.sendText(phone, "❌ Invalid pincode. Please enter a valid 6-digit pincode:");
      return { ok: true, action: "invalid_pincode", storeType };
    }

    convo.context.address ||= { house: "", street: "", pincode: "" };
    convo.context.address.pincode = pin;

    convo.state = "ADDRESS_CONFIRM";
    await saveConversation(storeType, convo);

    await whatsapp.sendButtons(phone, buildAddressConfirmButtons(convo.context.address));
    return { ok: true, action: "confirm_address", storeType };
  }

  // 7) ADDRESS_CONFIRM (buttons)
  if (convo.state === "ADDRESS_CONFIRM" && interactiveId) {
    // ---- CONFIRM -> CREATE PAYMENT LINK + STORE MAPPING ----
    if (interactiveId === "addr:confirm") {
      const total = Number(convo.context.total) || calculateTotal(convo.context.cart || {});
      const orderId = convo.context.orderId || `ORD-${phone}-${Date.now()}`;

      const link = await payment.createPaymentLink({
        amount: total,
        phone,
        referenceId: orderId,
      });

      // ✅ STORE MAPPING HERE (for webhook lookup)
      convo.context.orderId = orderId;
      convo.context.payment = {
        id: link.id,
        short_url: link.short_url,
        status: link.status || "created",
      };
      convo.context.paymentLinkId = link.id;       // ✅ Razorpay payment_link_id
      convo.context.invoiceGenerated = false;      // ✅ Idempotency flag
      convo.context.paidAt = null;

      convo.state = "PAYMENT_PENDING";
      await saveConversation(storeType, convo);

      const cartItems = Object.values(convo.context.cart || {})
        .map((item) => `• ${item.name} x${item.qty} = ₹${item.price * item.qty}`)
        .join("\n");
      const order_info =  `💳 Payment Link Created\n` +
          `Order: ${orderId}\n` +
          `Amount: ₹${total}\n\n` +
          `📦 Items:\n${cartItems}\n\n` +
          `Pay here: ${link.short_url}\n\n` +
          `After payment, you will receive invoice automatically.`
      await whatsapp.sendText(
        phone,
        order_info
      );

      return { ok: true, action: "payment_link_sent", orderId, paymentLinkId: link.id, order_info, storeType };
    }

    if (interactiveId === "addr:edit_house") {
      convo.state = "ADDRESS_HOUSE";
      await saveConversation(storeType, convo);
      await whatsapp.sendText(phone, "🏠 Enter your House No / Flat No again:");
      return { ok: true, action: "edit_house", storeType };
    }

    if (interactiveId === "addr:edit_street") {
      convo.state = "ADDRESS_STREET";
      await saveConversation(storeType, convo);
      await whatsapp.sendText(phone, "🛣️ Enter your Street / Area again:");
      return { ok: true, action: "edit_street", storeType };
    }

    if (interactiveId === "addr:edit_pincode") {
      convo.state = "ADDRESS_PINCODE";
      await saveConversation(storeType, convo);
      await whatsapp.sendText(phone, "📮 Enter your 6-digit Pincode again:");
      return { ok: true, action: "edit_pincode", storeType };
    }
  }

  // Optional: if user messages during PAYMENT_PENDING
  if (convo.state === "PAYMENT_PENDING") {
    await whatsapp.sendText(phone, "💳 Please complete the payment using the link sent. Once paid, invoice will be sent.");
    await whatsapp.sendText(phone, `Pay here: ${convo.context.payment.short_url}`);
    return { ok: true, action: "payment_pending_reminder", storeType,"pay_here":`Pay here: ${convo.context.payment.short_url}` };
  }
  return { ok: true, action: "no_action", state: convo.state, storeType };
}

export const handleMessage = asyncHandler(async (req, res) => {
  const result = await processWebhookBody(req.body);
  res.status(200).json(result);
});
