export type NodeType = string;
export type NodeCategory = "trigger" | "action" | "ai" | "logic" | "data";
export type NodeRuntime = "ready" | "design";
export type WorkflowConfigValue = boolean | number | string;

export type WorkflowPosition = {
  x: number;
  y: number;
};

export type WorkflowNodeData = {
  type: NodeType;
  label: string;
  description: string;
  category?: NodeCategory;
  runtime?: NodeRuntime;
  accent?: string;
  inputs?: string[];
  outputs?: string[];
  config: Record<string, WorkflowConfigValue>;
};

export type WorkflowNode = {
  id: string;
  type: "workflowNode";
  position: WorkflowPosition;
  data: WorkflowNodeData;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
};

export type WorkflowRecord = {
  id: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  created_at: string;
  updated_at: string;
};

export type WorkflowPayload = {
  name: string;
  description: string;
  definition: WorkflowDefinition;
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  status: string;
  progress: number;
  current_node_id: string | null;
  current_node_label: string | null;
  results: Record<string, unknown>;
  logs: Array<{
    type: string;
    message: string;
    nodeId?: string | null;
    nodeLabel?: string | null;
    progress?: number | null;
    timestamp?: string;
  }>;
  error: string | null;
  workflow_snapshot: WorkflowDefinition;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedAsset = {
  businessName: string;
  slug: string;
  path: string;
  files: string[];
  entrypoint?: string;
  theme?: string | null;
  architecture?: Record<string, string[]> | string[];
  blueprint?: {
    site_name?: string;
    tagline?: string;
    navigation?: string[];
    pages?: string[];
  };
};

export type NodeCatalogItem = {
  type: NodeType;
  label: string;
  description: string;
  accent: string;
  category: NodeCategory;
  runtime: NodeRuntime;
  inputs: string[];
  outputs: string[];
  defaultConfig: Record<string, WorkflowConfigValue>;
};

export const localAgentReadyTypes = new Set<NodeType>(["scraper", "enrichment", "analysis", "website_generator"]);

export const fallbackNodeCatalog: NodeCatalogItem[] = [
  {
    type: "trigger_webhook",
    label: "Webhook trigger",
    description: "Start a workflow from inbound lead capture events, forms, or partner systems.",
    accent: "#3b82f6",
    category: "trigger",
    runtime: "design",
    inputs: ["payload", "headers"],
    outputs: ["lead_event"],
    defaultConfig: {
      path: "/incoming-lead",
      authMode: "secret",
      samplePayload: "{ name: 'Ari', company: 'Northstar Labs' }"
    }
  },
  {
    type: "form_capture",
    label: "Form capture",
    description: "Collect intent, company profile, and routing attributes from a hosted intake form.",
    accent: "#22c55e",
    category: "trigger",
    runtime: "design",
    inputs: ["submission"],
    outputs: ["lead_profile"],
    defaultConfig: {
      formName: "Inbound lead brief",
      captureSource: "landing page",
      requireEmail: true
    }
  },
  {
    type: "schedule_trigger",
    label: "Schedule trigger",
    description: "Launch recurring prospecting jobs that keep the pipeline replenished every day.",
    accent: "#f59e0b",
    category: "trigger",
    runtime: "design",
    inputs: ["schedule"],
    outputs: ["run_window"],
    defaultConfig: {
      cadence: "Weekdays at 09:00",
      timezone: "America/New_York",
      backfill: false
    }
  },
  {
    type: "scraper",
    label: "Discover companies",
    description: "Search local markets and capture business basics for new lead candidates.",
    accent: "#8b5cf6",
    category: "action",
    runtime: "ready",
    inputs: ["keyword", "market"],
    outputs: ["lead_list"],
    defaultConfig: {
      keyword: "dentist",
      location: "Austin, Texas",
      maxResults: 18
    }
  },
  {
    type: "enrichment",
    label: "Research contacts",
    description: "Visit websites and pull emails, social handles, categories, and messaging cues.",
    accent: "#14b8a6",
    category: "data",
    runtime: "ready",
    inputs: ["lead_list"],
    outputs: ["company_profile"],
    defaultConfig: {
      includeSocials: true,
      includeEmails: true,
      includeSignals: true
    }
  },
  {
    type: "analysis",
    label: "AI qualify leads",
    description: "Use LLM reasoning to score fit, summarize pain points, and craft positioning.",
    accent: "#7c3aed",
    category: "ai",
    runtime: "ready",
    inputs: ["company_profile"],
    outputs: ["qualified_lead"],
    defaultConfig: {
      model: "llama-3.3-70b",
      temperature: 0.4,
      profileFocus: "high-intent local service brand",
      prompt:
        "Score each lead for outreach readiness, summarize growth signals, and produce a short sales angle."
    }
  },
  {
    type: "website_generator",
    label: "Generate microsite",
    description: "Use AI to plan brand, palette, pages, and generate a structured website bundle.",
    accent: "#ec4899",
    category: "action",
    runtime: "ready",
    inputs: ["qualified_lead"],
    outputs: ["generated_site"],
    defaultConfig: {
      theme: "groq-blueprint",
      pages: 3,
      includeContactForm: true,
      primaryGoal: "book more qualified calls",
      styleBias: "premium local business"
    }
  },
  {
    type: "api_call",
    label: "API call",
    description: "Push enriched or qualified lead data into your CRM, enrichment service, or calendar.",
    accent: "#60a5fa",
    category: "action",
    runtime: "design",
    inputs: ["payload"],
    outputs: ["response"],
    defaultConfig: {
      method: "POST",
      endpoint: "https://api.your-crm.com/leads",
      retries: 2
    }
  },
  {
    type: "whatsapp",
    label: "WhatsApp follow-up",
    description: "Trigger a conversational outbound sequence with localized copy and soft CTA variants.",
    accent: "#22c55e",
    category: "action",
    runtime: "design",
    inputs: ["qualified_lead"],
    outputs: ["delivery_status"],
    defaultConfig: {
      sender: "Lead Concierge",
      style: "soft",
      firstMessage: "Hi {{first_name}}, I put together a growth brief for {{company}}."
    }
  },
  {
    type: "if_else",
    label: "If / Else router",
    description: "Branch the journey when lead score, company size, or channel intent crosses a threshold.",
    accent: "#f97316",
    category: "logic",
    runtime: "design",
    inputs: ["lead_signal"],
    outputs: ["true_branch", "false_branch"],
    defaultConfig: {
      condition: "lead_score >= 80",
      routeTrue: "hot_pipeline",
      routeFalse: "nurture"
    }
  },
  {
    type: "transform",
    label: "Transform payload",
    description: "Clean, shape, and normalize data before it reaches the next agent or integration.",
    accent: "#a855f7",
    category: "data",
    runtime: "design",
    inputs: ["raw_payload"],
    outputs: ["normalized_payload"],
    defaultConfig: {
      mode: "map fields",
      preserveHistory: true,
      outputSchema: "lead_name,email,company,score"
    }
  }
];

export const fallbackSampleWorkflow: WorkflowPayload = {
  name: "Lead Capture to Microsite",
  description: "Discover local businesses, enrich contacts, qualify them with AI, and generate a tailored microsite.",
  definition: {
    nodes: [
      {
        id: "scraper-1",
        type: "workflowNode",
        position: { x: 80, y: 220 },
        data: {
          type: "scraper",
          label: "Discover companies",
          description: "Search Google Maps for service businesses in the target market.",
          category: "action",
          runtime: "ready",
          accent: "#8b5cf6",
          inputs: ["keyword", "market"],
          outputs: ["lead_list"],
          config: {
            keyword: "solar installer",
            location: "Phoenix, Arizona",
            maxResults: 18
          }
        }
      },
      {
        id: "enrichment-1",
        type: "workflowNode",
        position: { x: 410, y: 220 },
        data: {
          type: "enrichment",
          label: "Research contacts",
          description: "Collect contact signals, socials, and website copy for every company.",
          category: "data",
          runtime: "ready",
          accent: "#14b8a6",
          inputs: ["lead_list"],
          outputs: ["company_profile"],
          config: {
            includeSocials: true,
            includeEmails: true,
            includeSignals: true
          }
        }
      },
      {
        id: "analysis-1",
        type: "workflowNode",
        position: { x: 740, y: 220 },
        data: {
          type: "analysis",
          label: "AI qualify leads",
          description: "Identify urgency, growth signals, and draft a tailored angle for outreach.",
          category: "ai",
          runtime: "ready",
          accent: "#7c3aed",
          inputs: ["company_profile"],
          outputs: ["qualified_lead"],
          config: {
            model: "llama-3.3-70b",
            temperature: 0.35,
            profileFocus: "high-intent local service brand",
            prompt:
              "Score each lead for outreach readiness, summarize the strongest business signal, and write a concise outbound angle."
          }
        }
      },
      {
        id: "website-1",
        type: "workflowNode",
        position: { x: 1070, y: 220 },
        data: {
          type: "website_generator",
          label: "Generate microsite",
          description: "Turn the lead profile into a structured multi-page site bundle.",
          category: "action",
          runtime: "ready",
          accent: "#ec4899",
          inputs: ["qualified_lead"],
          outputs: ["generated_site"],
          config: {
            theme: "groq-blueprint",
            pages: 3,
            includeContactForm: true,
            primaryGoal: "book more qualified calls",
            styleBias: "premium local business"
          }
        }
      }
    ],
    edges: [
      { id: "edge-1", source: "scraper-1", target: "enrichment-1" },
      { id: "edge-2", source: "enrichment-1", target: "analysis-1" },
      { id: "edge-3", source: "analysis-1", target: "website-1" }
    ],
    viewport: { x: 0, y: 0, zoom: 0.82 }
  }
};

export const emptyWorkflow: WorkflowPayload = {
  name: "Untitled workflow",
  description: "Create an AI-native lead generation system with local agents, branching logic, and premium ops visibility.",
  definition: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
};
