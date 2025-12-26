import { Router } from "express";
import { handleMessage, processWebhookBody } from "./whatsapp.controller.js";

export const whatsappRoutes = Router();

/**
 * ✅ Meta verification (GET)
 */
whatsappRoutes.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

/**
 * ✅ Real Meta webhook (POST)
 */
whatsappRoutes.post("/webhook", handleMessage);

/**
 * 🧪 Local simulator (POST)
 * Enabled ONLY when USE_MOCK=true
 */
whatsappRoutes.post("/mock-incoming", async (req, res, next) => {
  try {
    if (process.env.USE_MOCK !== "true") {
      return res.status(403).json({
        error: "mock-incoming is disabled when USE_MOCK is not true"
      });
    }

    const isText = req.body?.from && typeof req.body?.text === "string";
    const isInteractive = req.body?.from && typeof req.body?.interactiveId === "string";

    let body;

    if (isText) {
      body = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "LOCAL_SIMULATOR",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  messages: [
                    {
                      from: req.body.from,
                      id: "local.wamid",
                      timestamp: String(Date.now()),
                      type: "text",
                      text: { body: req.body.text }
                    }
                  ]
                }
              }
            ]
          }
        ]
      };
    } else if (isInteractive) {
      const id = req.body.interactiveId;
      const isButton = id.startsWith("cart:");

      body = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "LOCAL_SIMULATOR",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  messages: [
                    {
                      from: req.body.from,
                      id: "local.wamid",
                      timestamp: String(Date.now()),
                      type: "interactive",
                      interactive: isButton
                        ? { type: "button_reply", button_reply: { id, title: "Simulated" } }
                        : { type: "list_reply", list_reply: { id, title: "Simulated" } }
                    }
                  ]
                }
              }
            ]
          }
        ]
      };
    } else {
      // Assume user sent full Meta payload
      body = req.body;
    }

    const result = await processWebhookBody(body);
    return res.json({ ok: true, result });
  } catch (err) {
    return next(err);
  }
});

