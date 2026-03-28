from copy import deepcopy

NODE_CATALOG = [
    {
        "type": "scraper",
        "label": "Find businesses",
        "description": "Search Google Maps and collect lead basics.",
        "accent": "amber",
        "defaultConfig": {
            "keyword": "coffee shop",
            "location": "Austin, Texas",
            "maxResults": 10,
            "browserEngine": "playwright",
        },
    },
    {
        "type": "enrichment",
        "label": "Enrich data",
        "description": "Visit websites to extract emails, socials, and page copy.",
        "accent": "emerald",
        "defaultConfig": {
            "includeSocials": True,
            "includeEmails": True,
            "browserEngine": "lightpanda",
        },
    },
    {
        "type": "analysis",
        "label": "Analyze data",
        "description": "Use Groq to turn raw leads into website-ready insights.",
        "accent": "sky",
        "defaultConfig": {
            "profileFocus": "local service brand",
            "tone": "friendly",
            "includePricingIdeas": True,
        },
    },
    {
        "type": "website_generator",
        "label": "Create website",
        "description": "Generate a starter Next.js site for each qualified lead.",
        "accent": "rose",
        "defaultConfig": {
            "theme": "sunrise-studio",
            "pages": 3,
            "includeContactForm": True,
        },
    },
]

SAMPLE_WORKFLOW = {
    "name": "Lead Generation + Website",
    "description": "Find local businesses, enrich them, analyze them with Groq, and generate starter websites.",
    "definition": {
        "nodes": [
            {
                "id": "scraper-1",
                "type": "workflowNode",
                "position": {"x": 80, "y": 120},
                "data": {
                    "type": "scraper",
                    "label": "Find businesses",
                    "description": "Search Google Maps for local businesses.",
                    "config": {
                        "keyword": "coffee shop",
                        "location": "Austin, Texas",
                        "maxResults": 12,
                        "browserEngine": "playwright",
                    },
                },
            },
            {
                "id": "enrichment-1",
                "type": "workflowNode",
                "position": {"x": 380, "y": 120},
                "data": {
                    "type": "enrichment",
                    "label": "Enrich data",
                    "description": "Find social links, emails, and website details.",
                    "config": {
                        "includeSocials": True,
                        "includeEmails": True,
                        "browserEngine": "lightpanda",
                    },
                },
            },
            {
                "id": "analysis-1",
                "type": "workflowNode",
                "position": {"x": 680, "y": 120},
                "data": {
                    "type": "analysis",
                    "label": "Analyze data",
                    "description": "Create AI business profiles with Groq.",
                    "config": {
                        "profileFocus": "local service brand",
                        "tone": "friendly",
                        "includePricingIdeas": True,
                    },
                },
            },
            {
                "id": "website-1",
                "type": "workflowNode",
                "position": {"x": 980, "y": 120},
                "data": {
                    "type": "website_generator",
                    "label": "Create website",
                    "description": "Generate launch-ready website files.",
                    "config": {
                        "theme": "sunrise-studio",
                        "pages": 3,
                        "includeContactForm": True,
                    },
                },
            },
        ],
        "edges": [
            {"id": "edge-1", "source": "scraper-1", "target": "enrichment-1"},
            {"id": "edge-2", "source": "enrichment-1", "target": "analysis-1"},
            {"id": "edge-3", "source": "analysis-1", "target": "website-1"},
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 0.85},
    },
}


def get_node_catalog() -> list[dict]:
    return deepcopy(NODE_CATALOG)


def get_node_template(node_type: str) -> dict:
    for item in NODE_CATALOG:
        if item["type"] == node_type:
            return deepcopy(item)
    raise ValueError(f"Unknown node type: {node_type}")
