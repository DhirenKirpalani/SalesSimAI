import { buildCompanyRagContext } from "@/lib/vector-store";
export { buildCompanyRagContext };

const RAG_KEYWORDS = [
  // product / capabilities
  "product",
  "feature",
  "features",
  "capability",
  "capabilities",
  "functionality",
  "tool",
  "tools",
  "platform",
  "solution",
  "service",
  "offering",
  "what does",
  "how does",
  "does it",
  "can it",
  "is it",
  "integration",
  "integrations",
  "api",
  "automation",
  "workflow",
  "dashboard",
  "report",
  "analytics",
  "ai",
  "security",
  "compliance",
  "gdpr",
  "soc2",
  "encryption",
  "data privacy",
  "sso",
  "single sign",

  // pricing
  "price",
  "pricing",
  "cost",
  "costs",
  "expensive",
  "cheap",
  "discount",
  "plan",
  "plans",
  "subscription",
  "license",
  "billing",
  "budget",
  "roi",
  "return on investment",
  "value",

  // competitor / switching
  "competitor",
  "competitors",
  "competition",
  "versus",
  "vs",
  "compare",
  "comparison",
  "better than",
  "switch",
  "switching",
  "migrate",
  "migration",
  "current vendor",
  "current tool",
  "currently use",
  "we use",
  "we currently",
  "deel",
  "rippling",
  "bamboo",
  "workday",
  "sap",
  "oracle",
  "salesforce",
  "hubspot",

  // company facts
  "company",
  "about you",
  "your company",
  "founded",
  "headquarters",
  "customers",
  "case study",
  "case studies",
  "client",
  "clients",
  "testimonial",
  "reference",
  "industry",
  "market",
  "size",
  "scale",

  // implementation / support
  "implementation",
  "onboarding",
  "setup",
  "training",
  "support",
  "customer support",
  "sla",
  "uptime",
  "maintenance",
  "contract",
  "terms",
  "trial",
  "pilot",
  "proof of concept",
  "poc",
];

const RAG_REGEX = new RegExp(
  `\\b(${RAG_KEYWORDS.map((k) => k.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "i"
);

/**
 * Fast rule-based classifier: does this user turn need company knowledge retrieval?
 * Most conversational turns (acknowledgements, clarifications, small talk) return false.
 */
export function shouldRetrieveRag(userText: string): boolean {
  if (!userText || userText.trim().length < 2) return false;
  return RAG_REGEX.test(userText.toLowerCase());
}

/**
 * Retrieve company knowledge only when the turn actually asks for it.
 */
export async function getConditionalRagContext(
  userText: string,
  organizationId: string,
  options: { limit?: number } = {}
): Promise<string> {
  if (!shouldRetrieveRag(userText)) return "";
  return buildCompanyRagContext(userText, organizationId, options);
}
