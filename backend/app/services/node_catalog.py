from copy import deepcopy

NODE_CATALOG = [
    {
        "type": "scraper",
        "label": "Find businesses",
        "description": "Search Google Maps and collect lead basics.",
        "accent": "amber",
        "category": "action",
        "runtime": "ready",
        "inputs": ["keyword", "market"],
        "outputs": ["lead_list"],
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
        "category": "data",
        "runtime": "ready",
        "inputs": ["lead_list"],
        "outputs": ["company_profile"],
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
        "category": "ai",
        "runtime": "ready",
        "inputs": ["company_profile"],
        "outputs": ["qualified_lead"],
        "defaultConfig": {
            "profileFocus": "local service brand",
            "tone": "friendly",
            "includePricingIdeas": True,
        },
    },
    {
        "type": "website_generator",
        "label": "Create website",
        "description": "Use Groq to plan brand, palette, pages, and generate a structured site bundle.",
        "accent": "rose",
        "category": "action",
        "runtime": "ready",
        "inputs": ["qualified_lead"],
        "outputs": ["generated_site"],
        "defaultConfig": {
            "theme": "groq-blueprint",
            "pages": 3,
            "includeContactForm": True,
            "primaryGoal": "book more qualified calls",
            "styleBias": "premium local business",
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
                    "description": "Plan and generate a structured website from the business profile.",
                    "config": {
                        "theme": "groq-blueprint",
                        "pages": 3,
                        "includeContactForm": True,
                        "primaryGoal": "book more qualified calls",
                        "styleBias": "premium local business",
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
