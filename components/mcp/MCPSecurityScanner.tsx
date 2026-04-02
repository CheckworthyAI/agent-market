"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button, Spinner } from "@heroui/react";

const SUMMARY_SEVERITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "PASS",
] as const;

/** Valid border tint (avoid `var(--x)33` — invalid in CSS). */
function severityBorder(fgVar: string, opacityPercent: string): string {
  return `color-mix(in oklab, ${fgVar} ${opacityPercent}, transparent)`;
}

function severityVars(sev: string): { fg: string; bg: string } {
  switch (sev) {
    case "CRITICAL":
      return { fg: "var(--severity-critical)", bg: "var(--severity-bg-critical)" };
    case "HIGH":
      return { fg: "var(--severity-high)", bg: "var(--severity-bg-high)" };
    case "MEDIUM":
      return { fg: "var(--severity-medium)", bg: "var(--severity-bg-medium)" };
    case "LOW":
      return { fg: "var(--severity-low)", bg: "var(--severity-bg-low)" };
    case "PASS":
      return { fg: "var(--severity-pass)", bg: "var(--severity-bg-pass)" };
    default:
      return { fg: "var(--severity-info)", bg: "var(--severity-bg-info)" };
  }
}

function scoreAppearance(score: number | null): { color: string; border: string } {
  if (score === null)
    return { color: "var(--muted)", border: "var(--border)" };
  if (score >= 80)
    return { color: "var(--success)", border: "color-mix(in oklch, var(--success) 35%, transparent)" };
  if (score >= 50)
    return { color: "var(--warning)", border: "color-mix(in oklch, var(--warning) 35%, transparent)" };
  if (score >= 25)
    return { color: "var(--tool-orange)", border: "color-mix(in oklch, var(--tool-orange) 35%, transparent)" };
  return { color: "var(--danger)", border: "color-mix(in oklch, var(--danger) 35%, transparent)" };
}

function scoreLabelText(score: number | null): string {
  if (score === null) return "—";
  if (score >= 80) return "SAFE";
  if (score >= 50) return "CAUTION";
  if (score >= 25) return "RISKY";
  return "DANGEROUS";
}

export default function MCPSecurityScanner({
  serverUrl = "",
  token = "",
}: {
  serverUrl?: string;
  token?: string;
}) {
  const [url, setUrl] = useState(serverUrl);
  const [authToken, setAuthToken] = useState(token);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState("");

  const scan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/mcp/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: authToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResults(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setScanning(false);
    }
  };

  const score = results
    ? results.findings.reduce((acc: number, f: any) => {
        if (f.severity === "CRITICAL") return acc - 30;
        if (f.severity === "HIGH") return acc - 15;
        if (f.severity === "MEDIUM") return acc - 8;
        if (f.severity === "LOW") return acc - 3;
        return acc;
      }, 100)
    : null;

  const clampedScore =
    score !== null ? Math.max(0, Math.min(100, score)) : null;
  const scoreVis = scoreAppearance(clampedScore);

  const inputCls = clsx(
    "min-w-0 flex-1 rounded-lg border bg-[var(--field-background)] px-3 py-2",
    "font-mono text-xs text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)]",
    "outline-none transition-colors focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/25",
    "border-[var(--field-border)]",
  );

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border border-divider bg-surface",
        "font-mono text-[13px] text-foreground shadow-[var(--surface-shadow)]",
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-divider bg-[var(--surface-secondary)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            🛡
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">Security Scanner</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Checks for tool poisoning, prompt injection &amp; misconfigurations
            </p>
          </div>
        </div>
        {clampedScore !== null && (
          <div
            className="flex shrink-0 flex-col items-center rounded-lg border px-4 py-2"
            style={{
              color: scoreVis.color,
              borderColor: scoreVis.border,
            }}
          >
            <span className="text-[28px] font-extrabold leading-none">
              {clampedScore}
            </span>
            <span
              className="mt-0.5 text-[10px] font-bold tracking-widest"
              style={{ color: scoreVis.color }}
            >
              {scoreLabelText(clampedScore)}
            </span>
          </div>
        )}
      </div>

      <form
        className="mcp-scanner-controls flex flex-wrap items-center gap-2 border-b border-divider bg-[var(--surface-secondary)] px-5 py-3"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (!scanning && url.trim()) void scan();
        }}
      >
        <input
          className={clsx(inputCls, "min-w-[12rem] flex-1")}
          type="text"
          inputMode="url"
          name="mcp-scan-endpoint"
          id="mcp-scan-endpoint"
          autoComplete="url"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://your-mcp-server.com/mcp"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className={clsx(inputCls, "w-full sm:w-44")}
          type="password"
          name="mcp-scan-authorization"
          id="mcp-scan-authorization"
          autoComplete="new-password"
          placeholder="Token (optional)"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
        />
        <Button
          type="submit"
          variant="danger"
          size="sm"
          className="shrink-0 font-bold"
          isDisabled={scanning || !url.trim()}
        >
          {scanning ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" />
              Scanning…
            </span>
          ) : (
            "Run Scan"
          )}
        </Button>
      </form>

      {error ? (
        <div
          className={clsx(
            "border-t border-danger/25 bg-[var(--tool-error-bg)] px-5 py-2",
            "text-xs font-medium text-danger",
          )}
        >
          {error}
        </div>
      ) : null}

      {scanning ? (
        <div className="px-5 py-4">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-[var(--focus)]" />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Connecting and analysing server metadata…
          </p>
        </div>
      ) : null}

      {results ? (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {SUMMARY_SEVERITIES.map((sev) => {
              const count = results.findings.filter(
                (f: any) => f.severity === sev,
              ).length;
              if (count === 0) return null;
              const { fg, bg } = severityVars(sev);
              return (
                <div
                  key={sev}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: bg,
                    borderColor: severityBorder(fg, "22%"),
                    color: fg,
                  }}
                >
                  <span className="font-extrabold">{count}</span>
                  <span>{sev}</span>
                </div>
              );
            })}
            <div className="ml-auto text-[11px] text-muted-foreground">
              {results.toolCount} tools · {results.resourceCount} resources ·{" "}
              {results.promptCount} prompts scanned
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {results.findings.map((f: any, i: number) => {
              const { fg, bg } = severityVars(f.severity);
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border p-3.5"
                  style={{
                    backgroundColor: bg,
                    borderColor: severityBorder(fg, "28%"),
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                      style={{
                        color: fg,
                        borderColor: severityBorder(fg, "38%"),
                      }}
                    >
                      {f.severity}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">
                      {f.title}
                    </span>
                    <span className="text-[10px] italic text-muted-foreground">
                      {f.check}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                  {f.evidence ? (
                    <pre
                      className={clsx(
                        "max-h-[120px] overflow-x-auto whitespace-pre-wrap break-all rounded-md border p-3",
                        "font-mono text-[11px]",
                      )}
                      style={{
                        background: "var(--tool-code-bg)",
                        borderColor: severityBorder(fg, "22%"),
                        color: "var(--tool-orange)",
                      }}
                    >
                      {f.evidence}
                    </pre>
                  ) : null}
                  {f.recommendation ? (
                    <div className="flex gap-2 text-start text-[11px] leading-snug text-[var(--tool-green)]">
                      <span aria-hidden>💡</span>
                      <span>{f.recommendation}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="border-t border-divider pt-3 text-center text-[10px] text-muted-foreground">
            Scanned at {new Date(results.scannedAt).toLocaleString()} · This scan
            analyses static metadata only. Runtime behaviour may differ.
          </p>
        </div>
      ) : null}
    </div>
  );
}
