"use client";

import { Card, Button, Chip, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { AgentTemplate } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

// ─── Step indicator ──────────────────────────────────────────────────────────
const steps = ["Configure", "Add MCPs", "Deploy"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${done
                  ? "bg-primary text-white"
                  : active
                    ? "bg-primary/20 border-2 border-primary text-primary"
                    : "bg-default-100 text-default-400"
                  }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-default-600" : "text-default-400"
                  }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mb-4 mx-2 transition-all duration-500 ${i < current ? "bg-primary" : "bg-default-200"
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Status log item ─────────────────────────────────────────────────────────
type StatusState = "pending" | "running" | "done" | "error";
interface LogItem {
  label: string;
  state: StatusState;
}

function StatusLog({ items }: { items: LogItem[] }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-5 text-center">
            {item.state === "running" && <Spinner size="sm" color="current" />}
            {item.state === "done" && <span className="text-green-500 font-bold">✓</span>}
            {item.state === "error" && <span className="text-red-500 font-bold">✕</span>}
            {item.state === "pending" && <span className="text-default-300">○</span>}
          </span>
          <span
            className={
              item.state === "done"
                ? "text-default-700"
                : item.state === "running"
                  ? "text-primary font-medium"
                  : item.state === "error"
                    ? "text-red-500"
                    : "text-default-400"
            }
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState<AgentTemplate | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [githubPat, setGithubPat] = useState("");
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [buildLog, setBuildLog] = useState<LogItem[]>([]);
  const [buildResult, setBuildResult] = useState<{
    github_repo?: string;
    cloud_run_url?: string;
    error?: string;
  } | null>(null);
  const [building, setBuilding] = useState(false);

  // Deploy-template button state
  const [deploying, setDeploying] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase.from("adk_mcps").select("*");
      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.from("adk_agent_templates").select("*");
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Open wizard (optionally pre-filled from a template) ───────────────────
  const openWizard = (template?: AgentTemplate) => {
    setPrefillTemplate(template || null);
    setCustomName(template?.name ?? "");
    setCustomDescription(template?.description ?? "");
    setCustomInstructions(template?.instructions ?? "");
    setSelectedEndpoints(template?.mcp_sse_endpoints ?? []);
    setGithubPat("");
    setStep(0);
    setBuildLog([]);
    setBuildResult(null);
    setBuilding(false);
    setIsModalOpen(true);
  };

  const closeWizard = () => {
    if (building) return;
    setIsModalOpen(false);
  };

  // ── "Deploy Template" quick-save (stores to DB only, no fork) ────────────
  const handleDeploy = async (template: AgentTemplate) => {
    setDeploying(template.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to deploy agents.");
        return;
      }

      const { error: upsertError } = await supabase
        .from("adk_agents")
        .upsert(
          {
            user_id: user.id,
            name: template.name,
            instructions: template.instructions,
            mcp_sse_endpoints: template.mcp_sse_endpoints,
            status: "inactive",
          },
          { onConflict: "name" }
        );

      if (upsertError) throw upsertError;
      alert(`Successfully saved ${template.name}!`);
    } catch (error: any) {
      console.error("Deployment error:", error);
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setDeploying(null);
    }
  };

  // ── Build Agent (fork → patch → push) ────────────────────────────────────
  const handleBuild = async () => {
    if (!customName || !customInstructions) {
      alert("Please provide both a name and instructions.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert("Please log in to build agents.");
      return;
    }

    setBuilding(true);
    setBuildLog([
      { label: "Forking template repository...", state: "running" },
      { label: "Patching agent.py with your config...", state: "pending" },
      { label: "Pushing to GitHub (triggers Cloud Run deploy)...", state: "pending" },
      { label: "Saving to Agent Market...", state: "pending" },
    ]);

    // Derive GitHub username from the PAT via GitHub API, or use env fallback
    let github_username = process.env.NEXT_PUBLIC_GITHUB_USERNAME || "";

    if (githubPat) {
      try {
        const ghUser = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${githubPat}` },
        }).then((r) => r.json());
        if (ghUser.login) github_username = ghUser.login;
      } catch (_) { }
    }

    if (!github_username) {
      setBuildLog([
        {
          label: "GitHub username could not be determined. Please provide a valid PAT.",
          state: "error",
        },
      ]);
      setBuilding(false);
      return;
    }

    try {
      // Step 1 running → Step 2 running
      await new Promise((r) => setTimeout(r, 500));

      const response = await fetch('/api/agent-market/build', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customName,
          description: customDescription,
          instructions: customInstructions,
          mcp_urls: selectedEndpoints,
          github_token: githubPat,
          github_username,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.error) {
        throw new Error(json.error || "Unknown error from build API endpoint");
      }

      setBuildLog([
        { label: "Forked template repository", state: "done" },
        { label: "Patched agent.py with your config", state: "done" },
        { label: "Pushed to GitHub (Cloud Run deploy triggered)", state: "done" },
        { label: "Saved to Agent Market", state: "done" },
      ]);
      setBuildResult({
        github_repo: json.github_repo,
        cloud_run_url: json.cloud_run_url,
      });
    } catch (err: any) {
      console.error("Build error:", err);
      setBuildLog((prev) =>
        prev.map((item) =>
          item.state === "running" || item.state === "pending"
            ? { ...item, state: "error" }
            : item
        )
      );
      setBuildResult({ error: err.message });
    } finally {
      setBuilding(false);
    }
  };

  // ── Step validation ────────────────────────────────────────────────────────
  const canAdvanceStep = () => {
    if (step === 0) return customName.trim() !== "" && customInstructions.trim() !== "";
    return true;
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" color="current" />
        <p className="text-default-500 animate-pulse">Loading Agent MarketPlace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-default-900">Agent MarketPlace</h1>
          <p className="text-default-500">Discover and build your own AI agents on GitHub + Cloud Run.</p>
        </div>

        <Button
          className="font-bold flex gap-2 h-10 px-6 bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          onClick={() => openWizard()}
        >
          <PlusIcon size={20} />
          Build Agent
        </Button>
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-divider rounded-xl">
          <p className="text-default-500">No templates found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="bg-surface border border-divider p-6 transition-colors hover:bg-surface-secondary flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <Chip size="sm" variant="soft" color="default" className="font-medium">
                    {template.category}
                  </Chip>
                  <div className="flex items-center gap-1 text-xs text-default-400">
                    <span>⭐ {template.stars}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-default-900 mb-2">{template.name}</h3>
                <p className="text-default-500 text-sm mb-6 pb-4 border-b border-divider">
                  {template.description}
                </p>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-lg font-bold text-default-900">
                  {template.price === 0 ? "Free" : `$${template.price}/mo`}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-medium h-9 px-4 hover:bg-default-100 transition-colors"
                    isDisabled={deploying !== null}
                    onClick={() => handleDeploy(template)}
                  >
                    {deploying === template.id ? <Spinner size="sm" color="current" /> : "Quick Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="font-bold h-9 px-4 shadow-sm hover:shadow-md hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    onClick={() => openWizard(template)}
                  >
                    Build Agent
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Build Wizard Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            className="bg-background border border-divider rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-left"
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-divider">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-default-900">
                  {prefillTemplate ? `Build: ${prefillTemplate.name}` : "Build Agent"}
                </h2>
                <p className="text-sm text-default-500">
                  Fork → Configure → Deploy to Cloud Run via GitHub Actions
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeWizard}
                isDisabled={building}
                className="min-w-0 p-2 rounded-full hover:bg-default-100 transition-colors"
              >
                ✕
              </Button>
            </div>

            {/* Step Bar */}
            <div className="px-6 pt-5">
              <StepBar current={step} />
            </div>

            {/* Step Content */}
            <div className="flex-grow overflow-y-auto px-6 pb-4 space-y-5">

              {/* ─── Step 0: Configure ─────────────────────────────────────── */}
              {step === 0 && (
                <>

                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-bold text-default-700"
                      htmlFor="build-agent-name"
                    >
                      Agent Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="build-agent-name"
                      name="build-agent-display-name"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore
                      placeholder="e.g. Research Assistant"
                      className="w-full bg-divider/10 border border-divider rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-bold text-default-700"
                      htmlFor="build-agent-summary"
                    >
                      Description
                    </label>
                    <input
                      id="build-agent-summary"
                      name="build-agent-summary"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore
                      placeholder="Short description of what this agent does"
                      className="w-full bg-divider/10 border border-divider rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      className="text-sm font-bold text-default-700"
                      htmlFor="build-agent-instructions"
                    >
                      Instructions <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="build-agent-instructions"
                      name="build-agent-instructions"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore
                      placeholder="How should this agent behave? What are its goals?"
                      className="w-full min-h-[120px] bg-divider/10 border border-divider rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* ─── Step 1: Select MCPs ────────────────────────────────────── */}
              {step === 1 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-default-500">
                      Select the MCP tools this agent can use. Each will be added as a{" "}
                      <code className="bg-default-100 px-1 rounded text-xs">McpToolset</code> in{" "}
                      <code className="bg-default-100 px-1 rounded text-xs">agent.py</code>.
                    </p>
                    {selectedEndpoints.length > 0 && (
                      <Chip size="sm" variant="soft" className="bg-primary/10 text-primary font-bold">
                        {selectedEndpoints.length} selected
                      </Chip>
                    )}
                  </div>

                  {presets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-divider rounded-xl text-default-400 text-sm">
                      No MCP servers found in your database.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {presets.map((preset) => {
                        const selected = selectedEndpoints.includes(preset.url);
                        return (
                          <div
                            key={preset.url}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${selected
                              ? "bg-primary/5 border-primary shadow-sm"
                              : "bg-surface border-divider hover:border-default-400"
                              }`}
                            onClick={() => {
                              setSelectedEndpoints((prev) =>
                                prev.includes(preset.url)
                                  ? prev.filter((u) => u !== preset.url)
                                  : [...prev, preset.url]
                              );
                            }}
                          >
                            <div
                              className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-default-400"
                                }`}
                            >
                              {selected && <span className="text-[10px] text-white font-bold">✓</span>}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold truncate">{preset.name}</span>
                              {preset.description && (
                                <span className="text-[11px] text-default-500 mt-0.5 line-clamp-2">
                                  {preset.description}
                                </span>
                              )}
                              <span className="text-[10px] text-default-400 truncate mt-0.5">
                                {preset.url}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ─── Step 2: Review & Deploy ─────────────────────────────────── */}
              {step === 2 && (
                <>
                  {!buildResult ? (
                    <>
                      {/* Preview code */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-default-700">
                          Generated <code className="bg-default-100 px-1 rounded">agent.py</code> preview
                        </label>
                        <pre className="bg-default-900 text-green-400 text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed">
                          {`from google.adk.agents.llm_agent import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

root_agent = Agent(
    model='gemini-2.5-flash',
    name='${customName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}',
    description='${(customDescription || customName).replace(/'/g, "\\'").slice(0, 60)}',
    instruction="""
        ${customInstructions.trim().slice(0, 120)}${customInstructions.length > 120 ? "..." : ""}
    """,
    tools=[${selectedEndpoints.length === 0
                              ? "\n        # No MCPs selected"
                              : selectedEndpoints.map(u => `\n        McpToolset(connection_params=StreamableHTTPConnectionParams(url="${u}")),`).join("")}
    ],
)`}
                        </pre>
                      </div>


                      {/* Log */}
                      {buildLog.length > 0 && <StatusLog items={buildLog} />}
                    </>
                  ) : buildResult.error ? (
                    <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="font-bold text-red-600">Build failed</p>
                      <p className="text-sm text-red-500">{buildResult.error}</p>
                      <StatusLog items={buildLog} />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col items-center gap-2 py-4">
                        <span className="text-5xl">🚀</span>
                        <p className="text-xl font-bold text-default-900">Agent Built!</p>
                        <p className="text-sm text-default-500 text-center">
                          Your GitHub repo was created and is now being deployed to Cloud Run via GitHub Actions.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">

                        <div className="flex items-center gap-3 p-3 bg-default-50 border border-divider rounded-xl">
                          <span className="text-2xl">☁️</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold">Cloud Run deploying...</span>
                            <span className="text-xs text-default-400">
                              The Agent is getting deployed to cloud run wait for few minutes.
                            </span>
                          </div>
                        </div>
                      </div>

                      <StatusLog items={buildLog} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-divider bg-background/50 flex justify-between items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (step === 0) closeWizard();
                  else setStep((s) => s - 1);
                }}
                isDisabled={building}
                className="font-medium hover:bg-default-100 transition-colors"
              >
                {step === 0 ? "Cancel" : "← Back"}
              </Button>

              <div className="flex items-center gap-3">
                {step < 2 && (
                  <Button
                    type="button"
                    className="font-bold min-w-[120px] h-10 bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    isDisabled={!canAdvanceStep()}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next →
                  </Button>
                )}

                {step === 2 && !buildResult && (
                  <Button
                    type="button"
                    className="font-bold min-w-[140px] h-10 bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    isDisabled={building}
                    onClick={handleBuild}
                  >
                    {building ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" color="current" /> Building...
                      </span>
                    ) : (
                      "🚀 Build & Deploy"
                    )}
                  </Button>
                )}

                {step === 2 && buildResult && !buildResult.error && (
                  <Button
                    type="button"
                    className="font-bold h-10 px-6 bg-primary text-primary-foreground"
                    onClick={closeWizard}
                  >
                    Done ✓
                  </Button>
                )}

                {step === 2 && buildResult?.error && (
                  <Button
                    type="button"
                    className="font-bold h-10 px-6 bg-primary text-primary-foreground"
                    onClick={() => {
                      setBuildResult(null);
                      setBuildLog([]);
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
