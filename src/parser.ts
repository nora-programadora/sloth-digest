export interface ChatMessage {
  timestamp: Date;
  sender: string;
  text: string;
}

// Example: "10/20/26, 9:06 PM - Maya: The client demo is Thursday"
const LINE_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}):(\d{2})\s?([AP]M)\s-\s(.*)$/i;

function toDate(m: RegExpMatchArray): Date {
  const [, month, day, yearRaw, hourRaw, minute, ampm] = m;
  let year = Number(yearRaw);
  if (year < 100) year += 2000;
  let hour = Number(hourRaw) % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  return new Date(year, Number(month) - 1, Number(day), hour, Number(minute));
}

export function parseChat(raw: string): ChatMessage[] {
  const clean = raw.replace(/[\u200e\u200f]/g, "");
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const line of clean.split(/\r?\n/)) {
    const m = line.match(LINE_RE);

    if (m) {
      const body = m[7];
      const split = body.match(/^([^:]+): ([\s\S]*)$/);
      if (!split) {
        current = null; // system line (group created, user added, etc.)
        continue;
      }
      current = { timestamp: toDate(m), sender: split[1].trim(), text: split[2] };
      messages.push(current);
    } else if (current) {
      current.text += "\n" + line; // continuation of a multi-line message
    }
  }

  return messages.filter((msg) => msg.text.trim() !== "<Media omitted>");
}