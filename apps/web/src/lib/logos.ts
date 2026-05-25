const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";
const BRANDFETCH_LOGO_API = "https://cdn.brandfetch.io";

// Known SaaS vendor slug overrides where the name doesn't match Simple Icons slug
const SLUG_OVERRIDES: Record<string, string> = {
  "microsoft 365": "microsoft",
  "google workspace": "google",
  "amazon web services": "amazonwebservices",
  "aws": "amazonwebservices",
  "github": "github",
  "slack": "slack",
  "notion": "notion",
  "figma": "figma",
  "stripe": "stripe",
  "datadog": "datadog",
  "salesforce": "salesforce",
  "vercel": "vercel",
  "linear": "linear",
  "asana": "asana",
  "atlassian": "atlassian",
  "jira": "jira",
  "confluence": "confluence",
  "hubspot": "hubspot",
  "okta": "okta",
  "vanta": "vanta",
  "drata": "drata",
  "ramp": "ramp",
  "brex": "brex",
  "spendesk": "spendesk",
  "zoom": "zoom",
  "adobe": "adobe",
  "adobe creative cloud": "adobecreativecloud",
};

export function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveSlug(vendorName: string): string {
  const lower = vendorName.trim().toLowerCase();
  return SLUG_OVERRIDES[lower] ?? toSlug(lower);
}

export function simpleIconsUrl(vendorName: string, color?: string): string {
  const slug = resolveSlug(vendorName);
  const c = color ? `/${color.replace("#", "")}` : "";
  return `${SIMPLE_ICONS_CDN}/${slug}${c}`;
}

export function brandfetchUrl(domain: string): string {
  return `${BRANDFETCH_LOGO_API}/${domain}/w/96/h/96/icon`;
}

// Monogram: deterministic 2-letter initials with a hashed pastel bg
export function monogramFor(vendorName: string): { initials: string; bg: string; fg: string } {
  const words = vendorName.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  const initials =
    words.length >= 2
      ? (first + second).toUpperCase()
      : vendorName.slice(0, 2).toUpperCase();
  const palette = [
    "#FDE68A", "#BFDBFE", "#FECACA", "#C7D2FE", "#A7F3D0",
    "#FBCFE8", "#FED7AA", "#DDD6FE", "#FCE7F3", "#BAE6FD",
    "#D9F99D", "#FBBF24",
  ];
  let hash = 0;
  for (let i = 0; i < vendorName.length; i++) hash = (hash * 31 + vendorName.charCodeAt(i)) >>> 0;
  const bg = palette[hash % palette.length] ?? "#BFDBFE";
  return { initials, bg, fg: "#0F172A" };
}

// Returns ordered list of URLs to try: Simple Icons → Brandfetch → []
export function attemptOrder(vendorName: string, domain?: string): string[] {
  const urls: string[] = [simpleIconsUrl(vendorName)];
  if (domain) urls.push(brandfetchUrl(domain));
  return urls;
}
