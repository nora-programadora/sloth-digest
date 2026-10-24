import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseChat } from "./parser.js";
import { summarizeChat, type Digest } from "./summarize.js";

const inputDir = process.argv[2] ?? "inbox";
const userName = process.env.DIGEST_USER ?? "Sam";
const today = new Date().toLocaleDateString("en-CA");

mkdirSync("out", { recursive: true });

const files = readdirSync(inputDir).filter((f) => f.endsWith(".txt"));
if (files.length === 0) {
  console.log(`No .txt chats found in ${inputDir}/`);
  process.exit(0);
}

const results: { chat: string; digest: Digest }[] = [];

for (const file of files) {
  const chat = basename(file, ".txt");
  try {
    const messages = parseChat(readFileSync(join(inputDir, file), "utf-8"));
    if (messages.length === 0) continue;
    console.log(`Summarizing ${chat} (${messages.length} messages)...`);
    results.push({ chat, digest: await summarizeChat(messages, userName) });
  } catch (err) {
    console.error(`Failed on ${chat}:`, err);
  }
}

const lines: string[] = [`# Morning digest, ${today}`, ""];

const allTasks = results.flatMap((r) =>
  r.digest.tasks_for_me.map((t) => ({ ...t, chat: r.chat }))
);

lines.push("## Needs you");
if (allTasks.length === 0) lines.push("Nothing today.");
for (const t of allTasks) {
  const due = t.resolved ? `${t.due} (${t.resolved})` : t.due;
  const said = t.said_at ? `, said ${t.said_at}` : "";
  lines.push(`- ${t.task}, due: ${due}${said}. Asked by ${t.asked_by} in ${t.chat}`);
}
lines.push("");

for (const { chat, digest } of results) {
  lines.push(`## ${chat}`, digest.summary, "");
  for (const d of digest.key_dates) lines.push(`- ${d.event}: ${d.when}`);
  lines.push("");
}

const outPath = join("out", `digest-${today}.md`);
writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${outPath}`);