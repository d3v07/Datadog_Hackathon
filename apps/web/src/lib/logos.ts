const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";
const BRANDFETCH_LOGO_API = "https://cdn.brandfetch.io";

// Brand color + simpleicons slug per seeded vendor id. Keys are vendor.id from
// seed/vendors.json (36 entries). The hex drives the colored CDN logo on the
// Portfolio cards/table; on 404 the VendorLogo component falls back to a
// monogram circle.
export interface VendorBrand {
  slug: string;
  hex: string;
}

export const VENDOR_BRAND: Record<string, VendorBrand> = {
  vnd_notion: { slug: "notion", hex: "000000" },
  vnd_stripe: { slug: "stripe", hex: "635BFF" },
  vnd_datadog: { slug: "datadog", hex: "632CA6" },
  vnd_okta: { slug: "okta", hex: "007DC1" },
  vnd_github: { slug: "github", hex: "181717" },
  vnd_cloudflare: { slug: "cloudflare", hex: "F38020" },
  vnd_snowflake: { slug: "snowflake", hex: "29B5E8" },
  vnd_auth0: { slug: "auth0", hex: "EB5424" },
  vnd_figma: { slug: "figma", hex: "F24E1E" },
  vnd_linear: { slug: "linear", hex: "5E6AD2" },
  vnd_vercel: { slug: "vercel", hex: "000000" },
  vnd_asana: { slug: "asana", hex: "F06A6A" },
  vnd_jira: { slug: "jira", hex: "0052CC" },
  vnd_hubspot: { slug: "hubspot", hex: "FF7A59" },
  vnd_intercom: { slug: "intercom", hex: "1F8DED" },
  vnd_zendesk: { slug: "zendesk", hex: "03363D" },
  vnd_mixpanel: { slug: "mixpanel", hex: "7856FF" },
  vnd_zoom: { slug: "zoom", hex: "0B5CFF" },
  vnd_dropbox: { slug: "dropbox", hex: "0061FF" },
  vnd_sentry: { slug: "sentry", hex: "362D59" },
  vnd_pagerduty: { slug: "pagerduty", hex: "06AC38" },
  vnd_mongodb: { slug: "mongodb", hex: "47A248" },
  vnd_1password: { slug: "1password", hex: "0572EC" },
  vnd_airtable: { slug: "airtable", hex: "18BFFF" },
  vnd_posthog: { slug: "posthog", hex: "1D4AFF" },
  vnd_sketch: { slug: "sketch", hex: "F7B500" },
  vnd_framer: { slug: "framer", hex: "0055FF" },
  vnd_miro: { slug: "miro", hex: "F7C922" },
  vnd_loom: { slug: "loom", hex: "625DF5" },
  vnd_calendly: { slug: "calendly", hex: "006BFF" },
  vnd_bitwarden: { slug: "bitwarden", hex: "175DDC" },
  vnd_discord: { slug: "discord", hex: "5865F2" },
  vnd_salesforce: { slug: "salesforce", hex: "00A1E0" },
  vnd_slack: { slug: "slack", hex: "4A154B" },
  vnd_aws: { slug: "amazonwebservices", hex: "FF9900" },
  vnd_adobe: { slug: "adobecreativecloud", hex: "DA1F26" },
};

export function brandForId(vendorId: string): VendorBrand | undefined {
  return VENDOR_BRAND[vendorId];
}

export function simpleIconsUrlForId(vendorId: string): string | undefined {
  const brand = VENDOR_BRAND[vendorId];
  if (!brand) return undefined;
  return `${SIMPLE_ICONS_CDN}/${brand.slug}/${brand.hex}`;
}

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
