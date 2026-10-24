import type { ChatMessage } from "./parser.js";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "gemma3:4b";

export interface Task {
  task: string;
  assignee: string;
  asked_by: string;
  due: string;
  said_at?: string;  // filled in code
  resolved?: string; // filled in code
}

export interface Digest {
  summary: string;
  tasks: Task[];
  tasks_for_me: Task[];
  key_dates: { event: string; when: string }[];
}

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          assignee: { type: "string" },
          asked_by: { type: "string" },
          due: { type: "string" },
        },
        required: ["task", "assignee", "asked_by", "due"],
      },
    },
    key_dates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          event: { type: "string" },
          when: { type: "string" },
        },
        required: ["event", "when"],
      },
    },
  },
  required: ["summary", "tasks", "key_dates"],
};


function systemPrompt(userName: string): string {
  return `You summarize a group chat for ${userName}, who has not read it.
Return ONLY JSON that matches the schema.

Rules:
- "summary": at most 2 short sentences with what ${userName} needs to know. Ignore small talk (food, jokes, sports, coffee).
- "tasks": every task someone asked for or promised in the chat, for ANY person. "assignee" is the person who must do it. If someone says "I'll do it" or "Will do", that person is the assignee, not the one who asked. If a later message adds requirements to a task (for example, what a document must include), add them to the task text.
- "due": copy the deadline EXACTLY as written in the chat (for example "tomorrow afternoon" or "Wednesday at noon"). Do not convert it into a date and do not add a time that was not said. Use "unknown" if there is no deadline.
- "key_dates": meetings, demos or deadlines. In "when", copy the date and time exactly as written in the LATEST message that mentions that event.
- Never invent information that is not in the chat. If there is nothing for a field, return an empty list.`;
}

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const when = m.timestamp.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        });
      return `[${when}] ${m.sender}: ${m.text}`;
    })
    .join("\n");
}

const fmt = (d: Date) =>
  d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function addSourceInfo(task: Task, messages: ChatMessage[]): Task {
  const needle = task.due.trim().toLowerCase();
  if (!needle || needle === "unknown") return task;

  const hit = [...messages]
    .reverse()
    .find((m) => m.text.toLowerCase().includes(needle));
  if (!hit) return task;

  const out: Task = { ...task, said_at: fmt(hit.timestamp) };
  if (needle.startsWith("tomorrow")) {
    const next = new Date(hit.timestamp);
    next.setDate(next.getDate() + 1);
    out.resolved = next.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return out;
}

export async function summarizeChat(
  messages: ChatMessage[],
  userName = "Sam"
): Promise<Digest> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: schema,
      options: { temperature: 0, num_ctx: 8192 },
      messages: [
        { role: "system", content: systemPrompt(userName) },
        { role: "user", content: formatTranscript(messages) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { message: { content: string } };
  const digest = JSON.parse(data.message.content) as Digest;
    digest.tasks_for_me = digest.tasks.filter(
    (t) => t.assignee.trim().toLowerCase() === userName.toLowerCase()
    );
    return digest;
}