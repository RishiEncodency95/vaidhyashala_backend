import mongoose, { Schema } from "mongoose";

/**
 * Vaidhya Mitra (website chat) — an IP's abuse warnings and block.
 * Three abusive messages block the IP for a day; the team can also block/unblock.
 */
const chatBlockSchema = new Schema(
  {
    ip: { type: String, required: true, unique: true, index: true, trim: true },
    strikes: { type: Number, default: 0 },
    blockedUntil: { type: Date },
    manual: { type: Boolean, default: false },
    blockedBy: { type: String, trim: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

const ChatBlock = mongoose.model("ChatBlock", chatBlockSchema);
export default ChatBlock;
