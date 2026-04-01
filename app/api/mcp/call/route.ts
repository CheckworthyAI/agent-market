import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url, token, toolName, args } = await req.json();

  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } });
    const client = new Client({ name: "agentaim-inspector", version: "1.0.0" });
    await client.connect(transport);

    const result = await client.callTool({ name: toolName, arguments: args });
    await client.close();

    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
