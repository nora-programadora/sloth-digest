import { readFileSync } from "node:fs";
import { parseChat } from "./parser.js";

const raw = readFileSync("samples/chat-team.txt", "utf-8");
const messages = parseChat(raw);

console.log(`Parsed ${messages.length} messages\n`);
for (const m of messages.slice(0, 8)) {
  console.log(`[${m.timestamp.toISOString()}] ${m.sender}: ${m.text}`);
}