export type NodeType = "scraper" | "enrichment" | "analysis" | "website_generator";

export type WorkflowPosition = {
  x: number;
  y: number;
};

export type WorkflowNodeData = {
  type: NodeType;
  label: string;
  description: string;
  config: Record<string, boolean | number | string>;
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

export type NodeCatalogItem = {
  type: NodeType;
  label: string;
  description: string;
  accent: string;
  defaultConfig: Record<string, boolean | number | string>;
};

export const fallbackNodeCatalog: NodeCatalogItem[] = [
  {
    type: "scraper",
    label: "Find businesses",
    description: "Search Google Maps and collect lead basics.",
    accent: "amber",
    defaultConfig: {
      keyword: "coffee shop",
      location: "Austin, Texas",
      maxResults: 10
    }
  },
  {
    type: "enrichment",
    label: "Enrich data",
    description: "Visit websites to extract emails, socials, and page copy.",
    accent: "emerald",
    defaultConfig: {
      includeSocials: true,
      includeEmails: true
    }
  },
  {
    type: "analysis",
    label: "Analyze data",
    description: "Use Groq to create website-ready positioning.",
    accent: "sky",
    defaultConfig: {
      profileFocus: "local service brand",
      tone: "friendly",
      includePricingIdeas: true
    }
  },
  {
    type: "website_generator",
    label: "Create website",
    description: "Generate a starter Next.js site for each lead.",
    accent: "rose",
    defaultConfig: {
      theme: "sunrise-studio",
      pages: 3,
      includeContactForm: true
    }
  }
];

export const fallbackSampleWorkflow: WorkflowPayload = {
  name: "Lead Generation + Website",
  description: "Find local businesses, enrich them, analyze them, and generate starter websites.",
  definition: {
    nodes: [
      {
        id: "scraper-1",
        type: "workflowNode",
        position: { x: 70, y: 130 },
        data: {
          type: "scraper",
          label: "Find businesses",
          description: "Search Google Maps for local businesses.",
          config: {
            keyword: "coffee shop",
            location: "Austin, Texas",
            maxResults: 12
          }
        }
      },
      {
        id: "enrichment-1",
        type: "workflowNode",
        position: { x: 370, y: 130 },
        data: {
          type: "enrichment",
          label: "Enrich data",
          description: "Collect emails, social links, and website copy.",
          config: {
            includeSocials: true,
            includeEmails: true
          }
        }
      },
      {
        id: "analysis-1",
        type: "workflowNode",
        position: { x: 670, y: 130 },
        data: {
          type: "analysis",
          label: "Analyze data",
          description: "Use Groq to create business insights.",
          config: {
            profileFocus: "local service brand",
            tone: "friendly",
            includePricingIdeas: true
          }
        }
      },
      {
        id: "website-1",
        type: "workflowNode",
        position: { x: 970, y: 130 },
        data: {
          type: "website_generator",
          label: "Create website",
          description: "Generate website starter files.",
          config: {
            theme: "sunrise-studio",
            pages: 3,
            includeContactForm: true
          }
        }
      }
    ],
    edges: [
      { id: "edge-1", source: "scraper-1", target: "enrichment-1" },
      { id: "edge-2", source: "enrichment-1", target: "analysis-1" },
      { id: "edge-3", source: "analysis-1", target: "website-1" }
    ],
    viewport: { x: 0, y: 0, zoom: 0.8 }
  }
};

export const emptyWorkflow: WorkflowPayload = {
  name: "Untitled workflow",
  description: "Start with an empty canvas and add only the steps you need.",
  definition: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
};
