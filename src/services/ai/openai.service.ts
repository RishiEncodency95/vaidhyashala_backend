import OpenAI from "openai";
import { openaiModel } from "./aiConfig";
import { buildCvAnalysisPrompt, CV_SYSTEM_PROMPT, type CvJobInput } from "./cvPrompt";

export interface AIAnalysisOutput {
  candidate: {
    name: string | null;
    email: string | null;
    phone: string | null;
    /** Additional numbers found in the CV, when it lists more than one. */
    phones?: string[];
    location: string | null;
    linkedin: string | null;
    /** Only set when the CV explicitly states it (e.g. a "Gender:" field) — never guessed from the name. */
    gender: "male" | "female" | null;
  };
  education: string[];
  experience: string[];
  skills: string[];
  achievements: string[];
  languages: string[];
  currentCompany: string | null;
  currentDesignation: string | null;
  totalExperience: string | null;
  /** Total years of paid work after studies (0 for a fresher); null when the CV does not show it */
  totalExperienceYears?: number | null;
  /** true when the CV shows a current job ("Present", "till date"); null when it cannot tell */
  currentlyEmployed?: boolean | null;
  noticePeriod: string | null;
  currentCTC: string | null;
  expectedCTC: string | null;

  /** Every role in the CV with its dates ("YYYY-MM" / "present"); experience years are computed from these */
  workHistory?: { title?: string; company?: string; start?: string; end?: string; relevant?: "yes" | "partial" | "no" | boolean; internship?: boolean }[];
  /** One entry per required skill of the job; the skills score is computed from these */
  requiredSkillsCheck?: { skill?: string; status?: string; evidence?: string }[];

  // Matching evaluation against Job Description
  evaluation: {
    relevantExperience: { score: number; evidence: string[] };
    skills: { score: number; matched: string[]; missing: string[] };
    education: { score: number; evidence: string[] };
    industryExperience: { score: number; evidence: string[] };
    roleFit: { score: number; evidence: string[] };
    location: { score: number; evidence: string[] };
  };

  matchedRequirements: string[];
  missingRequirements: string[];
  strengths: string[];
  gaps: string[];
  explanation: string;
}

export const analyzeCvWithOpenAI = async (cvText: string, jobDescription: CvJobInput): Promise<AIAnalysisOutput> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Without a bounded timeout, a stalled connection to OpenAI hangs the whole
  // /cv/analyze request indefinitely instead of falling through to Gemini.
  const openai = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 });

  const completion = await openai.chat.completions.create({
    model: openaiModel(),
    messages: [
      { role: "system", content: CV_SYSTEM_PROMPT },
      { role: "user", content: buildCvAnalysisPrompt(cvText, jobDescription) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as AIAnalysisOutput;
};
