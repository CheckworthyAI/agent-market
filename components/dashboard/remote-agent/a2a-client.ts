export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  images?: string[];
  timestamp: Date;
}

const BASE = "/api/a2a";

export async function getAgentCard(): Promise<{
  name: string;
  description: string;
  version: string;
}> {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not reach agent (${res.status})`);
  return res.json();
}

/**
 * Parses a raw SSE stream buffer into complete events.
 * Handles \n, \r\n, and \r line endings per the SSE spec.
 * Returns { events, remainder } where remainder is any incomplete trailing data.
 */
function parseSSEChunk(buf: string): { dataLines: string[]; remainder: string } {
  // Normalize line endings
  const normalized = buf.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // SSE events are separated by double newlines
  const eventBlocks = normalized.split("\n\n");

  // Last block may be incomplete — keep it in the buffer
  const remainder = eventBlocks.pop() ?? "";

  const dataLines: string[] = [];
  for (const block of eventBlocks) {
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
      // Could also handle `event:`, `id:`, `retry:` here if needed
    }
  }

  return { dataLines, remainder };
}

/**
 * Yields text chunks from an A2A streaming response.
 * Handles SSE framing correctly and extracts text parts from A2A JSON-RPC events.
 */
export async function* streamMessage(
  text: string,
  contextId: string
): AsyncGenerator<{ text?: string; image?: string }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "message/stream",
      params: {
        message: {
          kind: "message",
          role: "user",
          messageId: crypto.randomUUID(),
          contextId,
          parts: [{ kind: "text", text }],
        },
      },
    }),
  });

  console.log("[A2A] status:", res.status);
  console.log("[A2A] content-type:", res.headers.get("content-type"));

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    console.error("[A2A] error body:", errText);
    throw new Error(`Agent error ${res.status}: ${errText}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let chunkCount = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) { console.log("[A2A] stream done, total chunks:", chunkCount); break; }

    const raw = decoder.decode(value, { stream: true });
    console.log("[A2A] raw chunk:", JSON.stringify(raw)); // see exact bytes
    buf += raw;

    const normalized = buf.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = normalized.split("\n\n");
    buf = blocks.pop() ?? "";

    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        console.log("[A2A] data line:", data);

        if (!data || data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          console.log("[A2A] parsed event:", JSON.stringify(evt, null, 2));

          const parts =
            evt?.params?.message?.parts ??
            evt?.result?.message?.parts ??
            evt?.result?.parts ??
            [];

          console.log("[A2A] parts found:", parts);

          for (const p of parts) {
            if (p?.text) {
              chunkCount++;
              yield { text: p.text };
            } else if (p?.image?.url || p?.url) {
              chunkCount++;
              yield { image: p.image?.url || p.url };
            }
          }
        } catch (e) {
          console.error("[A2A] JSON parse error:", e, "raw:", data);
        }
      }
    }
  }

  reader.releaseLock();
}