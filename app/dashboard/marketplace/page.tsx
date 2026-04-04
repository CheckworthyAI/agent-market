"use client";

import { Card, Button, Chip, TextField, InputGroup, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { SearchIcon, PlusIcon } from "@/components/icons";
import { AgentTemplate } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [customName, setCustomName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);

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
      const { data, error } = await supabase
        .from("adk_agent_templates")
        .select("*");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (template: AgentTemplate) => {
    setDeploying(template.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in to deploy agents.");
        return;
      }


      const { error: upsertError } = await supabase
        .from("adk_agents")
        .upsert({
          user_id: user.id,
          name: template.name,
          instructions: template.instructions,
          mcp_sse_endpoints: template.mcp_sse_endpoints,
          status: "inactive"
        }, { onConflict: 'name' });

      if (upsertError) throw upsertError;
      alert(`Successfully deployed ${template.name}!`);
    } catch (error: any) {
      console.error("Deployment error:", error);
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setDeploying(null);
    }
  };

  const handleCreateCustomAgent = async () => {
    if (!customName || !customInstructions) {
      alert("Please provide both a name and instructions.");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to create agents.");
        return;
      }

      const { error: upsertError } = await supabase
        .from("adk_agents")
        .upsert({
          user_id: user.id,
          name: customName,
          instructions: customInstructions,
          mcp_sse_endpoints: selectedEndpoints,
          status: "inactive"
        }, { onConflict: 'name' });

      if (upsertError) throw upsertError;

      alert(`Successfully created custom agent: ${customName}!`);
      setIsModalOpen(false);
      setCustomName("");
      setCustomInstructions("");
      setSelectedEndpoints([]);

    } catch (error: any) {
      console.error("Creation error:", error);
      alert(error.message || "An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-default-900">Agent MarketPlace</h1>
          <p className="text-default-500">Discover or create your own custom AI agents.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <Button
            className="font-bold flex gap-2 h-10 px-6 bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon size={20} />
            Create My Agent
          </Button>

          <div className="w-full md:w-80">
            <TextField aria-label="Search templates">
              <InputGroup>
                <InputGroup.Prefix>
                  <SearchIcon className="text-muted-foreground" size={18} />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Search templates..." />
              </InputGroup>
            </TextField>
          </div>
        </div>
      </div>

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

              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-default-900">
                  {template.price === 0 ? "Free" : `$${template.price}/mo`}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  className="font-bold min-w-[120px] h-10 shadow-sm hover:shadow-md hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  isDisabled={deploying !== null}
                  onClick={() => handleDeploy(template)}
                >
                  {deploying === template.id ? <Spinner size="sm" color="current" /> : "Deploy Template"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-divider rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between p-6 border-b border-divider">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-default-900">Create Custom Agent</h2>
                <p className="text-sm text-default-500">Define your agent's personality and tools.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="min-w-0 p-2 rounded-full hover:bg-default-100 transition-colors"
              >
                ✕
              </Button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-default-700">Agent Name</label>
                <TextField aria-label="Agent Name">
                  <InputGroup>
                    <InputGroup.Input
                      placeholder="e.g. Research Assistant"
                      value={customName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomName(e.target.value)}
                    />
                  </InputGroup>
                </TextField>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-default-700">Instructions</label>
                <textarea
                  placeholder="How should this agent behave? What are its goals?"
                  className="w-full min-h-[120px] bg-divider/10 border border-divider rounded-xl px-4 py-3 text-sm outline-none focus:border-default-400 transition-colors"
                  value={customInstructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-default-700">MCP Endpoints (Tools)</label>
                <p className="text-xs text-default-400 mb-2">Select the background services this agent can use.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.url}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedEndpoints.includes(preset.url)
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-surface border-divider hover:border-default-400"
                        }`}
                      onClick={() => {
                        setSelectedEndpoints(prev =>
                          prev.includes(preset.url)
                            ? prev.filter(u => u !== preset.url)
                            : [...prev, preset.url]
                        );
                      }}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedEndpoints.includes(preset.url) ? "bg-primary border-primary" : "border-default-400"
                        }`}>
                        {selectedEndpoints.includes(preset.url) && <span className="text-[10px] text-white font-bold">✓</span>}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate">{preset.name}</span>
                        <span className="text-[10px] text-default-400 truncate">{preset.url}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-divider bg-background/50 flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="font-medium hover:bg-default-100 transition-colors"
              >
                Cancel
              </Button>
              <Button
                className="font-bold min-w-[120px] h-10 bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                isDisabled={creating}
                onClick={handleCreateCustomAgent}
              >
                {creating ? <Spinner size="sm" color="current" /> : "Build Agent"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
