import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url, token } = await req.json();

  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } });
    const client = new Client({ name: "agentaim-inspector", version: "1.0.0" });
    await client.connect(transport);

    const { resources } = await client.listResources();
    await client.close();

    return NextResponse.json({ items: resources });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
