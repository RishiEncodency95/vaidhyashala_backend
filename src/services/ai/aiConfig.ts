import OpenAI from "openai";

/**
 * Shared AI settings for the Careers features (job descriptions and CV screening).
 * Keys and models come from .env:
 *   OPENAI_API_KEY, OPENAI_MODEL   (primary)
 *   GEMINI_API_KEY, GEMINI_MODEL   (fallback when OpenAI fails or is not configured)
 * Read when used (not at import), so the values loaded by dotenv are always seen.
 */
export const openaiModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
// "-latest" follows Google's current Flash model, so a retired model version never breaks the fallback
export const geminiModel = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

/** Who is hiring, for every Careers prompt */
export const COMPANY_CONTEXT =
  "Vaidhyashala, an Ayurvedic clinic and Panchakarma centre in Delhi NCR, India (a brand of Namo Gange Wellness Pvt. Ltd.). " +
  "It offers Ayurvedic doctor consultations, Panchakarma and supporting therapies, yoga and lifestyle guidance, and Ayurvedic medicines and products. " +
  "Typical roles: Ayurvedic doctors (BAMS / MD Ayurveda), Panchakarma therapists, nursing and therapy assistants, front desk / patient coordinators, " +
  "pharmacy and dispensary staff, and support functions such as HR, accounts, marketing and operations.";

/** OpenAI, JSON mode */
async function openaiJson(system: string, prompt: string, temperature: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  // A bounded timeout so a stalled connection falls through to Gemini instead of hanging the request
  const openai = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 });
  const completion = await openai.chat.completions.create({
    model: openaiModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}

/** Gemini, JSON mode */
export async function geminiJson(system: string, prompt: string, temperature: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent?key=${apiKey}`;
  // Plain fetch never times out on its own: bound it so a stall cannot hang the request
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status} ${(await response.text()).slice(0, 300)}`);
  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Empty response from Gemini");
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/** A JSON answer from OpenAI, or from Gemini when OpenAI fails; says which one answered */
export async function generateJson(
  system: string,
  prompt: string,
  temperature = 0.2
): Promise<{ json: unknown; provider: "OpenAI" | "Gemini" }> {
  try {
    return { json: JSON.parse(await openaiJson(system, prompt, temperature)), provider: "OpenAI" };
  } catch (openAiError) {
    console.warn("⚠️ OpenAI failed, trying Gemini:", (openAiError as Error).message);
    return { json: JSON.parse(await geminiJson(system, prompt, temperature)), provider: "Gemini" };
  }
}
