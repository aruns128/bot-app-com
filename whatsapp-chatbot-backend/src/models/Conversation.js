
import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  state: {
    type: String,
    enum: ["NEW", "CATEGORY", "ITEM", "QTY", "ADDRESS", "PAYMENT"],
    default: "NEW"
  },
  context: { type: Object, default: {} }
}, { timestamps: true });

export const Conversation = mongoose.model("Conversation", ConversationSchema);
