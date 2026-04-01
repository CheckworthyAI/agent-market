import { NextRequest } from 'next/server'
import Sandbox from 'e2b'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export async function GET(request: NextRequest, { params }: { params: { agent: string } }) {
  const { agent } = params

  if (!process.env.E2B_API_KEY) {
    return new Response(JSON.stringify({ error: 'E2B_API_KEY is not configured' }), { status: 500 })
  }

  let sandbox: InstanceType<typeof Sandbox> | undefined
  let client: Client | undefined

  try {
    // Select minimal MCP config per agent
    const mcpConfig: Record<string, unknown> = (() => {
      switch (agent) {
        case 'fetcher':
          return {
            'github/jae-jae/fetcher-mcp': {
              installCmd: 'npm install && npx playwright install chromium',
              runCmd: 'node build/index.js',
            },
          }
        case 'perplexity':
          return { perplexityAsk: { perplexityApiKey: process.env.PERPLEXITY_API_KEY } }
        case 'wikipedia':
          return { wikipedia: {} }
        case 'hackernews':
          return { hackernews: {} }
        case 'airbnb':
          return { airbnb: {} }
        case 'paper-search':
          return { paperSearch: {} }
        case 'imagegen':
          return { imageGen: { replicateApiKey: process.env.REPLICATE_API_TOKEN } }
        case 'youtube':
        default:
          return { youtubeTranscript: {} }
      }
    })()

    sandbox = await Sandbox.create({ mcp: mcpConfig })

    client = new Client({ name: 'tools-list-client', version: '1.0.0' })
    const mcpUrl = sandbox.getMcpUrl()
    const mcpToken = await sandbox.getMcpToken()

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
      requestInit: { headers: { Authorization: `Bearer ${mcpToken}` } },
    })

    await client.connect(transport)

    const { tools } = await client.listTools()
    const toolNames = tools.map((t) => t.name)

    return new Response(JSON.stringify({ tools: toolNames }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  } finally {
    if (client) {
      try { await client.close() } catch { }
    }
    if (sandbox) {
      try { await sandbox.kill() } catch { }
    }
  }
}
