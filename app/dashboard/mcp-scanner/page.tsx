import MCPSecurityScanner from "../../../components/mcp/MCPSecurityScanner";
import React from "react";

export default function MCPScannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">MCP Security Scanner</h1>
        <p className="text-muted-foreground">
          Run a static, client-side scan of an MCP server for prompt-injection and
          misconfiguration indicators.
        </p>
      </div>

      <div className="mt-4">
        <MCPSecurityScanner />
      </div>
    </div>
  );
}
