import { AIAnalysisOutput } from "./openai.service";
import { geminiJson } from "./aiConfig";
import { buildCvAnalysisPrompt, CV_SYSTEM_PROMPT, type CvJobInput } from "./cvPrompt";

/** CV analysis with Gemini (GEMINI_MODEL in .env): the fallback when OpenAI fails */
export const analyzeCvWithGemini = async (cvText: string, jobDescription: CvJobInput): Promise<AIAnalysisOutput> =>
  JSON.parse(await geminiJson(CV_SYSTEM_PROMPT, buildCvAnalysisPrompt(cvText, jobDescription), 0.1)) as AIAnalysisOutput;
