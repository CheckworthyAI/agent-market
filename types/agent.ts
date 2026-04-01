export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stars: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface UserAgent {
  id: string;
  user_id: string;
  template_id: string;
  name: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'paused';
  created_at: string;
}
