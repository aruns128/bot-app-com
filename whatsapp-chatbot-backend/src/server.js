import { app } from "./app.js";

app.listen(process.env.PORT, () => {
  console.log(`🚀 WhatsApp chatbot backend running on port ${process.env.PORT}`);
});
