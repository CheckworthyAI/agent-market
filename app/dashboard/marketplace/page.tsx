"use client";

import { Card, Button, Chip, TextField, InputGroup, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { AgentTemplate } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_templates")
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
      const { error: insertError } = await supabase
        .from("user_agents")
        .insert({
          user_id: user.id,
          template_id: template.id,
          name: template.name,
          config: {},
          status: "inactive"
        });
      
      if (insertError) throw insertError;
      alert(`Successfully deployed ${template.name}! Check your agents dashboard.`);
    } catch (error) {
      console.error("Deployment error:", error);
      alert("An unexpected error occurred during deployment.");
    } finally {
      setDeploying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" color="accent" />
        <p className="text-default-500 animate-pulse">Loading marketplace templates...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-default-900">Marketplace</h1>
          <p className="text-default-500">Discover and deploy pre-trained AI agent templates.</p>
        </div>
        
        <div className="w-full md:w-80">
          <TextField aria-label="Search templates" type="search">
            <InputGroup>
              <InputGroup.Prefix>
                <SearchIcon className="text-muted" size={18} />
              </InputGroup.Prefix>
              <InputGroup.Input placeholder="Search templates..." />
            </InputGroup>
          </TextField>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-divider rounded-xl">
          <p className="text-default-500">No templates found in the marketplace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {templates.map((template) => (
            <Card key={template.id} className="bg-background/60 backdrop-blur-md border border-divider p-6 shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <Chip size="sm" variant="soft" color="accent" className="font-bold">
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
                  className="font-bold min-w-[120px]"
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
    </div>
  );
}
