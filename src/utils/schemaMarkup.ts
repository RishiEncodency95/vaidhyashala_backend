/**
 * Schema markup as it may be pasted in the admin's SEO Information box:
 *   - plain JSON-LD: { "@context": "https://schema.org", ... }  (or an array of them)
 *   - inside <script type="application/ld+json"> ... </script>
 *   - inside <script type="application/json"> ... </script>, or a bare <script>
 *   - several of those one after another
 * Returns the JSON-LD objects, [] when empty, or null when any part is not valid JSON.
 */
export function parseSchemaMarkup(raw: string): object[] | null {
  const text = (raw ?? "").trim();
  if (!text) return [];
  const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const chunks = scripts.length ? scripts : [text];
  const out: object[] = [];
  for (const chunk of chunks) {
    const body = chunk.trim().replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
    if (!body) continue;
    try {
      const parsed = JSON.parse(body);
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        if (!item || typeof item !== "object") return null;
        out.push(item);
      }
    } catch {
      return null;
    }
  }
  return out;
}
