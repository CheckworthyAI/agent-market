import { NextRequest } from "next/server";

const REMOTE_AGENT = "https://capital-agent-service-git-475756125529.us-central1.run.app";

export async function GET() {
  const res = await fetch(`${REMOTE_AGENT}/.well-known/agent.json`, {
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const jsonBody = (() => {
    try { return JSON.parse(body); } catch { return {}; }
  })();

  const isStream = jsonBody?.method === "message/stream";

  // Note the trailing slash: /anime/
  const upstream = await fetch(`${REMOTE_AGENT}/anime/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": isStream ? "text/event-stream" : "application/json",
    },
    body,
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(err, { status: upstream.status });
  }

  if (isStream) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Prevents buffering on Vercel/Nginx
      },
    });
  }

  const data = await upstream.json();
  return Response.json(data);
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}