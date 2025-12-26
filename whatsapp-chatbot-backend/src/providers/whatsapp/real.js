
import axios from "axios";

const api = axios.create({
  baseURL: `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
  headers: {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json"
  }
});

export function sendText(to, text) {
  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  });
}

export function sendList(to, list) {
  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: list
  });
}

export function sendButtons(to, buttonsPayload) {
  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: buttonsPayload
  });
}


export function sendDocument(to, url, filename = "invoice.pdf", caption = "") {
  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      link: url,
      filename,
      caption
    }
  });
}

export async function uploadDocument(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("messaging_product", "whatsapp");

  const res = await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
    form,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, ...form.getHeaders() } }
  );

  return res.data.id; // media_id
}

export async function sendDocumentById(to, mediaId, caption = "") {
  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      id: mediaId,
      caption,
    },
  });
}
