"use client";

import { useState } from "react";
import { Button, TextField, InputGroup } from "@heroui/react";
import { ThemeSwitch } from "@/components/theme-switch";
import { useTheme } from "next-themes";

const TABS = ["Tools", "Resources", "Prompts"];

export default function MCPInspector() {
  // Connection form values (used for creating a new server entry)
  const [serverUrl, setServerUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  // Multi-server state: each server has id, url, token, info, tools, resources, prompts
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState("Tools");
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [callResult, setCallResult] = useState<any>(null);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildRepoUrl, setBuildRepoUrl] = useState("");
  const [buildType, setBuildType] = useState<"HTTP" | "SSE" | "STDIO">("HTTP");
  const [building, setBuilding] = useState(false);
  const BUILD_TYPES = ["HTTP", "SSE", "STDIO"];

  const activeServer = servers.find((s) => s.id === activeServerId) || null;
  const connected = !!activeServer;

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const LIGHT_C = {
    bg: "#f6f7fb",
    surface: "#ffffff",
    border: "#e6e7eb",
    borderHover: "#d7d8de",
    text: "#0b1020",
    muted: "#6b7280",
    accent: "#6b46ff",
    accentHover: "#7c5cff",
    green: "#16a34a",
    red: "#dc2626",
    orange: "#ea580c",
    cyan: "#0891b2",
  };

  const colors = isLight ? LIGHT_C : C;
  const styles = getStyles(colors);

  const serverLabel = (s: any) => {
    try {
      return s.info?.name || new URL(s.url).hostname;
    } catch (e) {
      return s.info?.name || s.url;
    }
  };

  const PRESET_SERVERS = [
    { id: "preset-boosted", url: "https://api.boostedchat.com/mcp", token: "" , name: "BoostedChat"},
    { id: "preset-pubmed", url: "https://pubmed.caseyjhand.com/mcp", token: "", name: "PubMed (caseyjhand)" },
    { id: "preset-skiplagged", url: "https://mcp.skiplagged.com/mcp", token: "", name: "Skiplagged MCP" },
    { id: "preset-aeo", url: "https://aeo-mcp-server.amdal-dev.workers.dev/mcp", token: "", name: "AEO MCP" },
    { id: "preset-frog", url: "https://frog03-20494.wykr.es/mcp", token: "", name: "Frog MCP" },
    { id: "preset-koreannews", url: "https://korean-news-mcp.onrender.com/mcp", token: "", name: "Korean News MCP" },
    { id: "preset-varrd", url: "https://app.varrd.com/mcp", token: "", name: "Varrd MCP" },
    { id: "preset-pga", url: "https://mcp.pga.com/mcp", token: "", name: "PGA MCP" },
    { id: "preset-petstore", url: "https://petstore.run.mcp.com.ai/mcp", token: "", name: "Petstore MCP" },
    { id: "preset-linkedin", url: "https://linkedin.run.mcp.com.ai/mcp", token: "", name: "LinkedIn MCP" },
  ];

  const addPresetAndConnect = async (preset: { id: string; url: string; token?: string }) => {
    // Connect immediately using the preset values
    await connect(preset.url, preset.token || "");
  };

  const addLog = (type: string, message: string) => {
    const entry = {
      id: Date.now(),
      type,
      message,
      time: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50));
    if (activeServerId) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === activeServerId ? { ...s, logs: [entry, ...(s.logs || [])].slice(0, 50) } : s
        )
      );
    }
  };

  const connect = async (urlParam?: string, tokenParam?: string) => {
    const urlToUse = urlParam ?? serverUrl;
    const tokenToUse = tokenParam ?? authToken;
    if (!urlToUse?.trim()) return;
    setConnecting(true);
    setError("");
    setSelectedTool(null);
    setCallResult(null);

    addLog("request", `Connecting to ${urlToUse}`);

    try {
      const res = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToUse, token: tokenToUse }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Connection failed");

      const id = Date.now();
      const serverEntry = {
        id,
        url: urlToUse,
        token: tokenToUse,
        info: data.serverInfo,
        tools: [],
        resources: [],
        prompts: [],
        logs: [],
      };

      setServers((prev) => [serverEntry, ...prev]);
      setActiveServerId(id);
      addLog("success", `Connected: ${data.serverInfo?.name || "MCP Server"} v${data.serverInfo?.version || "?"}`);

      // fetch tools for the new server
      await fetchTab("Tools", serverEntry);
    } catch (e: any) {
      setError(e.message);
      addLog("error", e.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    if (!activeServer) return;
    setServers((prev) => prev.filter((s) => s.id !== activeServerId));
    setActiveServerId((prev) => {
      const remaining = servers.filter((s) => s.id !== prev);
      return remaining.length ? remaining[0].id : null;
    });
    setSelectedTool(null);
    setCallResult(null);
    addLog("info", "Disconnected");
  };

  const fetchTab = async (tab: string, serverObj?: any) => {
    const server = serverObj || activeServer;
    if (!server) return;
    const endpoint = tab.toLowerCase();
    addLog("request", `→ ${endpoint}/list (${server.url})`);
    try {
      const res = await fetch(`/api/mcp/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: server.url, token: server.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to list ${endpoint}`);

      setServers((prev) =>
        prev.map((s) =>
          s.id === server.id
            ? {
                ...s,
                tools: tab === "Tools" ? data.items || [] : s.tools,
                resources: tab === "Resources" ? data.items || [] : s.resources,
                prompts: tab === "Prompts" ? data.items || [] : s.prompts,
              }
            : s
        )
      );

      addLog("response", `← ${data.items?.length || 0} ${endpoint}`);
    } catch (e: any) {
      addLog("error", e.message);
    }
  };

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSelectedTool(null);
    setCallResult(null);
    if (connected) fetchTab(tab);
  };

  const openBuildModal = () => {
    setBuildRepoUrl("");
    setBuildType("HTTP");
    setShowBuildModal(true);
  };

  const closeBuildModal = () => setShowBuildModal(false);

  const buildFromGit = async () => {
    if (!buildRepoUrl.trim()) {
      setError("Please provide a repository URL");
      return;
    }
    setBuilding(true);
    addLog("request", `Building MCP from ${buildRepoUrl} (${buildType})`);
    try {
      const res = await fetch('/api/mcp/build-from-git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: buildRepoUrl, type: buildType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Build failed');
      addLog('success', `Build started: ${data.message || 'ok'}`);
      setShowBuildModal(false);
    } catch (e: any) {
      addLog('error', e.message || String(e));
    } finally {
      setBuilding(false);
    }
  };

  const callTool = async () => {
    if (!selectedTool || !activeServer) return;
    setCalling(true);
    setCallResult(null);
    addLog("request", `→ tools/call: ${selectedTool.name} on ${activeServer.url}`);
    addLog("request", `  args: ${JSON.stringify(toolArgs)}`);

    try {
      const res = await fetch("/api/mcp/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: activeServer.url,
          token: activeServer.token,
          toolName: selectedTool.name,
          args: toolArgs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tool call failed");
      setCallResult(data.result);
      addLog("response", `← success`);
    } catch (e: any) {
      setCallResult({ error: e.message });
      addLog("error", e.message);
    } finally {
      setCalling(false);
    }
  };

  const renderSchemaField = (key: string, schema: any) => {
    const type = schema?.type || "string";
    const description = schema?.description || "";
    const fieldId = `schema-${key}`;

    return (
      <div key={key} style={styles.field}>
        <label htmlFor={fieldId} style={styles.fieldLabel}>
          {key}
          {schema?.required && <span style={styles.required}> *</span>}
          <span style={styles.fieldType}> {type}</span>
        </label>
        {description && <p style={styles.fieldDesc}>{description}</p>}
        {type === "boolean" ? (
          <select
            id={fieldId}
            style={styles.input}
            value={toolArgs[key] ?? ""}
            onChange={(e) =>
              setToolArgs((p) => ({ ...p, [key]: e.target.value === "true" }))
            }
          >
            <option value="">--</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : type === "number" || type === "integer" ? (
          <input
            id={fieldId}
            style={styles.input}
            type="number"
            placeholder={key}
            value={toolArgs[key] ?? ""}
            onChange={(e) =>
              setToolArgs((p) => ({ ...p, [key]: Number(e.target.value) }))
            }
          />
        ) : (
          <input
            id={fieldId}
            style={styles.input}
            type="text"
            placeholder={key}
            value={toolArgs[key] ?? ""}
            onChange={(e) =>
              setToolArgs((p) => ({ ...p, [key]: e.target.value }))
            }
          />
        )}
      </div>
    );
  };

  const getSchemaFields = (tool: any) => {
    const props = (tool?.inputSchema?.properties || {}) as Record<string, any>;
    const required = (tool?.inputSchema?.required || []) as string[];
    return Object.entries(props).map(([key, schema]: [string, any]) => ({
      key,
      schema: { ...(schema as any), required: required.includes(key) },
    }));
  };

  const activeItems = activeServer
    ? activeTab === "Tools"
      ? activeServer.tools || []
      : activeTab === "Resources"
      ? activeServer.resources || []
      : activeServer.prompts || []
    : [];

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>⬡</span>
          <span style={styles.title}>MCP Inspector</span>

          <div style={styles.serverTabs}>
            {servers.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveServerId(s.id);
                  setSelectedTool(null);
                  setCallResult(null);
                  if (!s.tools || s.tools.length === 0) fetchTab("Tools", s);
                }}
                style={styles.serverTab(activeServerId === s.id)}
                title={s.url}
              >
                {serverLabel(s)}
                {s.info?.version && <span style={styles.serverBadge}>{` v${s.info.version}`}</span>}
              </button>
            ))}
            <button
              onClick={() => {
                setActiveServerId(null);
                setServerUrl("");
                setAuthToken("");
                setSelectedTool(null);
                setCallResult(null);
              }}
              style={styles.serverNew}
            >
              + New
            </button>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12, alignItems: 'center' }}>
              <label htmlFor="server-presets" style={{ color: colors.muted, fontSize: 12, marginRight: 8 }}>Presets:</label>
              <select
                id="server-presets"
                style={styles.serverPresetDropdown}
                value={selectedPresetId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPresetId(id);
                  const preset = PRESET_SERVERS.find((p) => p.id === id);
                  if (preset) addPresetAndConnect(preset);
                }}
              >
                <option value="">Choose preset…</option>
                {PRESET_SERVERS.map((p) => (
                  <option key={p.id} value={p.id} style={{ color: colors.text, background: colors.surface }}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.statusDot(connected)} />
        </div>
      </div>

      <div style={styles.connectBar}>
        {!connected ? (
          <>
            <input
              style={styles.urlInput}
              type="text"
              placeholder="https://your-mcp-server.com/mcp"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !connected && connect()}
            />
            <input
              style={{ ...styles.urlInput, width: 180 }}
              type="password"
              placeholder="Bearer token (optional)"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
            <Button
              className=""
              onPress={() => connect()}
              isDisabled={connecting || !serverUrl.trim()}
              style={styles.connectBtn(connecting || !serverUrl.trim())}
            >
              {connecting ? "Connecting…" : "Connect"}
            </Button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: colors.muted, fontSize: 12 }}>{activeServer?.url}</div>
            </div>
            <Button style={styles.connectBtn(false)} onPress={() => fetchTab(activeTab)}>
              Refresh
            </Button>
            <Button variant="secondary" style={styles.disconnectBtn} onPress={disconnect}>
              Remove
            </Button>
          </>
        )}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.main}>
        <div style={styles.leftPanel}>
          <div style={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-pressed={activeTab === tab}
                style={styles.tab(activeTab === tab)}
                onClick={() => switchTab(tab)}
                disabled={!connected}
              >
                {tab}
                {tab === "Tools" && (activeServer?.tools || []).length > 0 && (
                  <span style={styles.count}>{(activeServer?.tools || []).length}</span>
                )}
                {tab === "Resources" && (activeServer?.resources || []).length > 0 && (
                  <span style={styles.count}>{(activeServer?.resources || []).length}</span>
                )}
                {tab === "Prompts" && (activeServer?.prompts || []).length > 0 && (
                  <span style={styles.count}>{(activeServer?.prompts || []).length}</span>
                )}
              </button>
            ))}
          </div>

          <div style={styles.list}>
            {!connected && (
              <div style={styles.emptyState}>
                Connect to an MCP server to explore its capabilities
              </div>
            )}
            {connected && activeItems.length === 0 && (
              <>
                <div style={styles.emptyState}>No {activeTab.toLowerCase()} found</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <Button variant="secondary" onPress={openBuildModal} style={{ padding: '6px 10px' }}>
                    Build from Git
                  </Button>
                </div>
              </>
            )}
            {activeItems.map((item: any) => (
              <button
                key={item.name || item.uri}
                style={styles.listItem(selectedTool?.name === item.name)}
                onClick={() => {
                  setSelectedTool(item);
                  setToolArgs({});
                  setCallResult(null);
                }}
              >
                <div style={styles.itemName}>{item.name || item.uri}</div>
                {item.description && (
                  <div style={styles.itemDesc}>{item.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.rightPanel}>
          {!selectedTool ? (
            <div style={styles.emptyState}>
              {connected
                ? `Select a ${activeTab.slice(0, -1).toLowerCase()} to inspect`
                : "Connect to get started"}
            </div>
          ) : (
            <div style={styles.detail}>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailName}>{selectedTool.name}</div>
                  {selectedTool.description && (
                    <div style={styles.detailDesc}>{selectedTool.description}</div>
                  )}
                </div>
              </div>

              {activeTab === "Tools" && (
                <>
                  <div style={styles.sectionLabel}>Input Parameters</div>
                  {getSchemaFields(selectedTool).length === 0 ? (
                    <div style={styles.noParams}>No parameters required</div>
                  ) : (
                    <div style={styles.fields}>
                      {getSchemaFields(selectedTool).map(({ key, schema }) =>
                        renderSchemaField(key, schema)
                      )}
                    </div>
                  )}

                  <Button
                    style={styles.callBtn(calling)}
                    onPress={callTool}
                    isDisabled={calling}
                  >
                    {calling ? "Running…" : "▶  Run Tool"}
                  </Button>

                  {callResult && (
                    <>
                      <div style={styles.sectionLabel}>Result</div>
                      <pre style={styles.result(!!callResult.error)}>
                        {JSON.stringify(callResult, null, 2)}
                      </pre>
                    </>
                  )}
                </>
              )}

              {activeTab !== "Tools" && (
                <>
                  <div style={styles.sectionLabel}>Details</div>
                  <pre style={styles.result(false)}>
                    {JSON.stringify(selectedTool, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={styles.logPanel}>
        <div style={styles.logHeader}>
          <span>JSON-RPC Log</span>
          <Button variant="secondary" style={styles.clearBtn} onPress={() => setLogs([])}>
            clear
          </Button>
        </div>
        <div style={styles.logBody}>
          {(activeServer?.logs || logs).length === 0 && (
            <span style={{ color: colors.muted }}>No activity yet</span>
          )}
          {(activeServer?.logs || logs).map((log: any) => (
            <div key={log.id} style={styles.logEntry(log.type)}>
              <span style={styles.logTime}>{log.time}</span>
              <span style={styles.logMsg(log.type)}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
      {showBuildModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={{ fontWeight: 700 }}>Build MCP from Git</div>
            </div>
            <div style={styles.modalBody}>
              <div>
                <label htmlFor="build-repo-url" style={{ fontSize: 12, color: colors.muted }}>Repository URL</label>
                <input
                  id="build-repo-url"
                  style={styles.input}
                  value={buildRepoUrl}
                  onChange={(e) => setBuildRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                />
              </div>

              <div>
                <label htmlFor="build-type" style={{ fontSize: 12, color: colors.muted }}>MCP Type</label>
                <select
                  id="build-type"
                  value={buildType}
                  onChange={(e) => setBuildType(e.target.value as any)}
                  style={styles.input}
                >
                  {BUILD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={styles.modalFooter}>
                <Button variant="secondary" onPress={closeBuildModal} isDisabled={building}>
                  Cancel
                </Button>
                <Button onPress={buildFromGit} isDisabled={building} style={{ marginLeft: 8 }}>
                  {building ? "Building…" : "Build"}
                </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const C = {
  bg: "#0d0d0f",
  surface: "#141416",
  border: "#1e1e22",
  borderHover: "#2e2e35",
  text: "#e8e8f0",
  muted: "#5a5a6e",
  accent: "#7c6af7",
  accentHover: "#9585ff",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  cyan: "#22d3ee",
};

function getStyles(C: any): any {
  return {
  root: {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    background: C.bg,
    color: C.text,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: `1px solid ${C.border}`,
    background: C.surface,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { fontSize: 18, color: C.accent },
  title: { fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", color: C.text },
  serverBadge: {
    background: "#1a1a2e",
    border: `1px solid ${C.accent}44`,
    color: C.accent,
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
  },
  statusDot: (connected: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: connected ? C.green : C.muted,
    boxShadow: connected ? `0 0 6px ${C.green}` : "none",
    transition: "all 0.3s",
  }),
  connectBar: {
    display: "flex",
    gap: 8,
    padding: "12px 20px",
    borderBottom: `1px solid ${C.border}`,
    background: C.surface,
  },
  urlInput: {
    flex: 1,
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "8px 12px",
    color: C.text,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s",
  },
  connectBtn: (disabled: boolean) => ({
    background: disabled ? "#1e1e28" : C.accent,
    color: disabled ? C.muted : "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 20px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  }),
  disconnectBtn: {
    background: "transparent",
    color: C.red,
    border: `1px solid ${C.red}44`,
    borderRadius: 6,
    padding: "8px 20px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  errorBanner: {
    background: "#2a0f0f",
    border: `1px solid ${C.red}44`,
    color: C.red,
    padding: "8px 20px",
    fontSize: 12,
  },
  main: {
    flex: 1,
    display: "flex",
    minHeight: 0,
    overflow: "hidden",
  },
  leftPanel: {
    width: 280,
    borderRight: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  tabs: {
    display: "flex",
    borderBottom: `1px solid ${C.border}`,
  },
  serverTabs: {
    display: "flex",
    gap: 8,
    marginLeft: 16,
    alignItems: "center",
  },
  serverTab: (active: boolean) => ({
    background: active ? C.surface : "transparent",
    color: active ? C.text : C.muted,
    border: `1px solid ${active ? C.accent + "44" : "transparent"}`,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  }),
  serverNew: {
    background: "transparent",
    color: C.accent,
    border: `1px dashed ${C.accent}66`,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  serverPreset: {
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  serverPresetDropdown: {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    appearance: "none",
    // ensure readable contrast
    outline: "none",
  },
  tab: (active: boolean) => ({
    flex: 1,
    padding: "10px 0",
    background: active ? C.surface : "transparent",
    border: "none",
    borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
    color: active ? C.text : C.muted,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.15s",
  }),
  count: {
    background: C.accent + "33",
    color: C.accent,
    borderRadius: 10,
    padding: "0px 5px",
    fontSize: 10,
    fontWeight: 700,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
  },
  listItem: (active: boolean) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    background: active ? C.surface : "transparent",
    border: `1px solid ${active ? C.accent + "44" : "transparent"}`,
    borderRadius: 6,
    padding: "10px 12px",
    marginBottom: 4,
    cursor: "pointer",
    color: C.text,
    fontFamily: "inherit",
    transition: "all 0.15s",
  }),
  itemName: { fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 2 },
  itemDesc: { fontSize: 11, color: C.muted, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  rightPanel: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
  },
  emptyState: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 60,
    lineHeight: 1.6,
  },
  detail: { display: "flex", flexDirection: "column", gap: 16 },
  detailHeader: {
    borderBottom: `1px solid ${C.border}`,
    paddingBottom: 16,
  },
  detailName: { fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 },
  detailDesc: { fontSize: 12, color: C.muted, lineHeight: 1.6 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 8,
  },
  fields: { display: "flex", flexDirection: "column", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: C.cyan },
  fieldType: { color: C.muted, fontWeight: 400 },
  required: { color: C.red },
  fieldDesc: { fontSize: 11, color: C.muted, margin: 0 },
  input: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    padding: "7px 10px",
    color: C.text,
    fontFamily: "inherit",
    fontSize: 12,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  noParams: { color: C.muted, fontSize: 12, padding: "8px 0" },
  callBtn: (loading: boolean) => ({
    background: loading ? "#1e1e28" : C.accent,
    color: loading ? C.muted : "#fff",
    border: "none",
    borderRadius: 6,
    padding: "10px 20px",
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    alignSelf: "flex-start",
    transition: "all 0.2s",
  }),
  result: (isError: boolean) => ({
    background: isError ? "#1a0808" : "#0a0a12",
    border: `1px solid ${isError ? C.red + "44" : C.border}`,
    borderRadius: 6,
    padding: 16,
    color: isError ? C.red : C.green,
    fontSize: 11,
    lineHeight: 1.6,
    overflow: "auto",
    margin: 0,
    fontFamily: "inherit",
    maxHeight: 400,
  }),
  logPanel: {
    height: 160,
    borderTop: `1px solid ${C.border}`,
    background: C.surface,
    display: "flex",
    flexDirection: "column",
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 16px",
    borderBottom: `1px solid ${C.border}`,
    color: C.muted,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: C.muted,
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "inherit",
    padding: "2px 4px",
  },
  logBody: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  logEntry: (type: string) => ({
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  }),
  logTime: { color: "#333", fontSize: 10, flexShrink: 0, paddingTop: 1 },
  logMsg: (type: string) => ({
    fontSize: 11,
    color:
      type === "error" ? C.red
      : type === "success" ? C.green
      : type === "request" ? C.cyan
      : type === "response" ? C.orange
      : C.muted,
    lineHeight: 1.5,
  }),
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 16,
    width: 560,
    maxWidth: "100%",
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  },
  modalHeader: {
    borderBottom: `1px solid ${C.border}`,
    paddingBottom: 8,
    marginBottom: 8,
  },
  modalBody: { display: "flex", flexDirection: "column", gap: 12 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  };
}

// styles factory is exported only if needed; module uses it internally
