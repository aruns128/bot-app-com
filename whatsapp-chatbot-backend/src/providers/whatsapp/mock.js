
export async function sendText(to, text) {
  console.log(`📩 MOCK WhatsApp → ${to}: ${text}`);
}

export async function sendList(to, list) {
  console.log("📋 MOCK LIST:", JSON.stringify(list, null, 2));
}

export async function sendButtons(to, buttonsPayload) {
  console.log("🔘 MOCK BUTTONS →", to, JSON.stringify(buttonsPayload, null, 2));
}


export async function sendDocument(to, url, filename = "invoice.pdf", caption = "") {
  console.log("📄 MOCK DOCUMENT →", { to, url, filename, caption });
  // In mock we just log. (Optionally also sendText with link)
}
