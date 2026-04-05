export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

const BASE = "/api/a2a";

export async function getAgentCard() {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not reach agent");
  return res.json() as Promise<{ name: string; description: string; version: string }>;
}

export async function* streamMessage(
  text: string,
  contextId: string
): AsyncGenerator<string> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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

  if (!res.ok) throw new Error(`Agent error: ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;

      try {
        const evt = JSON.parse(raw);
        // Look for parts in params (streaming) or result (static)
        const parts =
          evt?.params?.message?.parts ??
          evt?.result?.message?.parts ??
          evt?.result?.parts ??
          [];

        for (const p of parts) {
          if (p?.text) yield p.text as string;
        }
      } catch {
        // Silently skip malformed SSE lines
      }
    }
  }
}