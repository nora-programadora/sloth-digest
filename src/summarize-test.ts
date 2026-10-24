import { readFileSync } from "node:fs";
import { parseChat } from "./parser.js";
import { summarizeChat } from "./summarize.js";

const raw = readFileSync("samples/chat-team.txt", "utf-8");
const messages = parseChat(raw);

const start = Date.now();
const digest = await summarizeChat(messages, "Sam");
const seconds = ((Date.now() - start) / 1000).toFixed(1);

console.log(JSON.stringify(digest, null, 2));
console.log(`\nDone in ${seconds}s`);