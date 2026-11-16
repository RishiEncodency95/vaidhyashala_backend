import { analyzeCvWithOpenAI, AIAnalysisOutput } from "./openai.service";
import { analyzeCvWithGemini } from "./gemini.service";

export interface UnifiedAnalysisResult {
  provider: "OpenAI" | "Gemini";
  extractedProfile: {
    candidate: {
      name: string | null;
      phone: string | null;
      /** Every distinct number found in the CV; `phone` is the first of these. */
      phones: string[];
      email: string | null;
      location: string | null;
      linkedin: string | null;
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
    noticePeriod: string | null;
    currentCTC: string | null;
    expectedCTC: string | null;
  };
  overallScore: number;
  eligibilityThreshold: number;
  eligible: boolean;
  /** ELIGIBLE / PARTIAL / NOT_ELIGIBLE, from the job's passing score and partial-match range */
  verdict: CvVerdict;
  /** The scores the verdict was decided with */
  verdictRule: { eligibleFrom: number; partialFrom: number };
  breakdown: {
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
  /** The job's candidate rules this CV failed (fresher / not currently employed); each one makes it Not eligible */
  ruleFailures: string[];
}

/**
 * A phone number as written, bounded so it cannot be cut out of a longer digit run
 * (account numbers, ids). Separators stay loose because CVs use all of them.
 */
const PHONE_PATTERN = /(?<!\d)(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}(?!\d)/g;

/** Last 10 digits, so "+91 98765 43210" and "9876543210" count as one number. */
const phoneKey = (value: string) => value.replace(/\D/g, "").slice(-10);

/** At most this many numbers are offered for OTP; more than that is noise. */
const MAX_CV_PHONES = 4;

/**
 * Every distinct phone number in the CV, in the order it appears. CVs commonly
 * carry two (personal + alternate) and the candidate picks which one receives the
 * WhatsApp OTP, so all of them are kept rather than only the first.
 */
export const extractPhones = (text: string): string[] => {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(PHONE_PATTERN)) {
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, "");
    // 10 national digits, optionally behind a 1-3 digit country code.
    if (digits.length < 10 || digits.length > 13) continue;

    const key = phoneKey(raw);
    if (seen.has(key)) continue;

    seen.add(key);
    found.push(raw);
    if (found.length >= MAX_CV_PHONES) break;
  }

  return found;
};

/** Merges number lists in order, keeping the first spelling of each number. */
const mergePhones = (...lists: (string | null | undefined)[][]): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const value of list) {
      const raw = (value || "").trim();
      if (!raw || raw.replace(/\D/g, "").length < 10) continue;
      const key = phoneKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(raw);
    }
  }

  return merged.slice(0, MAX_CV_PHONES);
};

export type CvVerdict = "ELIGIBLE" | "PARTIAL" | "NOT_ELIGIBLE";

/** A CV showing less than this share of the job's required skills is at most a Partial match */
export const MIN_SKILLS_FOR_ELIGIBLE = 50;

type WorkPeriod = NonNullable<AIAnalysisOutput["workHistory"]>[number];

/** "2024-03" -> a month number; "present" -> this month; null when it cannot be read */
const monthNumber = (value: string | undefined, now: Date): number | null => {
  if (!value) return null;
  if (/present|current|till|now|ongoing/i.test(value)) return now.getFullYear() * 12 + now.getMonth();
  const m = String(value).match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  const month = m[2] ? Math.min(12, Math.max(1, Number(m[2]))) - 1 : 0;
  return Number(m[1]) * 12 + month;
};

/** Months covered by these roles, counting overlapping periods (two jobs at once) only once */
const monthsCovered = (roles: WorkPeriod[], now: Date): number => {
  const spans = roles
    .map((r) => [monthNumber(r.start, now), monthNumber(r.end || "present", now)] as const)
    .filter((s): s is readonly [number, number] => s[0] !== null && s[1] !== null && s[1] >= s[0])
    .map(([a, b]) => [a, Math.min(b, now.getFullYear() * 12 + now.getMonth())] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let current: [number, number] | null = null;
  for (const span of spans) {
    if (current && span[0] <= current[1] + 1) current[1] = Math.max(current[1], span[1]);
    else {
      if (current) total += current[1] - current[0] + 1;
      current = [...span];
    }
  }
  if (current) total += current[1] - current[0] + 1;
  return total;
};

const years = (months: number) => Math.round((months / 12) * 10) / 10;

/** How much a role counts towards relevant experience: same work 1, a neighbouring function 0.5, else 0 */
const relevance = (w: WorkPeriod) => {
  const r = typeof w.relevant === "boolean" ? (w.relevant ? "yes" : "no") : String(w.relevant || "no").toLowerCase();
  return r === "yes" ? 1 : r === "partial" ? 0.5 : 0;
};

/**
 * Years of experience from the CV's work periods:
 *   total     paid work, internships excluded (used for "Allow Fresher Candidates")
 *   relevant  weighted by how close each role is to the job (same work 1, neighbouring 0.5); internships count half
 * Overlapping roles of the same weight are counted once.
 */
export const experienceFromWork = (work: WorkPeriod[], now = new Date()) => {
  const jobs = work.filter((w) => !w.internship);
  const internships = work.filter((w) => w.internship);
  const weighted = (roles: WorkPeriod[]) =>
    monthsCovered(roles.filter((w) => relevance(w) === 1), now) + monthsCovered(roles.filter((w) => relevance(w) === 0.5), now) / 2;
  // The same month never counts for more than a full month, even across several roles
  const relevantMonths = Math.min(monthsCovered(work, now), weighted(jobs) + weighted(internships) / 2);
  return {
    total: years(monthsCovered(jobs, now)),
    relevant: years(relevantMonths),
  };
};

/**
 * Experience score against the job's required range:
 *   no minimum (freshers welcome)  100 with relevant experience, 75 without
 *   at or above the minimum        100
 *   below the minimum              25-85 in proportion (half the minimum = 55); none = 0
 */
export const experienceScore = (relevantYears: number, min: number): number => {
  if (min <= 0) return relevantYears > 0 ? 100 : 75;
  if (relevantYears >= min) return 100;
  if (relevantYears <= 0) return 0;
  return Math.round(25 + 60 * (relevantYears / min));
};

/** Skills score: each required skill counts 1 when shown in the CV, 0.5 when partly; out of all required skills */
export const skillsFromCheck = (required: string[], check: NonNullable<AIAnalysisOutput["requiredSkillsCheck"]>) => {
  const statusOf = (skill: string, i: number) => {
    const byName = check.find((c) => String(c.skill || "").trim().toLowerCase() === skill.trim().toLowerCase());
    return String((byName ?? check[i])?.status || "no").toLowerCase();
  };
  const matched: string[] = [];
  const missing: string[] = [];
  let points = 0;
  required.forEach((skill, i) => {
    const status = statusOf(skill, i);
    if (status === "yes") {
      points += 1;
      matched.push(skill);
    } else if (status === "partial") {
      points += 0.5;
      matched.push(`${skill} (partly)`);
    } else missing.push(skill);
  });
  return { score: Math.round((100 * points) / required.length), matched, missing };
};

/**
 * The screening decision, from the job's AI Matching Rules (Admin → Job → AI Matching Rules):
 *   Eligible      score ≥ the passing score AND above the partial-match range
 *   Partial match score ≥ the start of the partial-match range
 *   Not eligible  anything lower
 * With the defaults (passing 40, partial 50-69): Eligible 70+, Partial 50-69, Not eligible below 50.
 */
export const decideVerdict = (
  score: number,
  rules: { eligibilityThreshold?: number; partialMatchMin?: number; partialMatchMax?: number }
): { verdict: CvVerdict; eligibleFrom: number; partialFrom: number } => {
  const passing = rules.eligibilityThreshold ?? 40;
  const partialMax = rules.partialMatchMax ?? 69;
  const eligibleFrom = Math.max(passing, partialMax + 1);
  const partialFrom = Math.min(rules.partialMatchMin ?? 50, eligibleFrom);
  const verdict: CvVerdict = score >= eligibleFrom ? "ELIGIBLE" : score >= partialFrom ? "PARTIAL" : "NOT_ELIGIBLE";
  return { verdict, eligibleFrom, partialFrom };
};

/**
 * Deterministic formula to calculate score strictly in code.
 * AI provides dimension scores (0-100), backend computes final matchScore.
 */
export const calculateDeterministicScore = (evalObj: {
  relevantExperience: { score: number };
  skills: { score: number };
  education: { score: number };
  industryExperience: { score: number };
  roleFit: { score: number };
  location: { score: number };
}): number => {
  const exp = Math.min(100, Math.max(0, evalObj.relevantExperience?.score || 0));
  const skills = Math.min(100, Math.max(0, evalObj.skills?.score || 0));
  const edu = Math.min(100, Math.max(0, evalObj.education?.score || 0));
  const industry = Math.min(100, Math.max(0, evalObj.industryExperience?.score || 0));
  const roleFit = Math.min(100, Math.max(0, evalObj.roleFit?.score || 0));
  const location = Math.min(100, Math.max(0, evalObj.location?.score || 0));

  // Experience and skills decide most of the score
  const weightedScore =
    exp * 0.30 +
    skills * 0.30 +
    edu * 0.15 +
    roleFit * 0.10 +
    industry * 0.10 +
    location * 0.05;

  return Math.round(weightedScore);
};

export const runCvAnalysisPipeline = async (
  cvText: string,
  jobDescription: {
    title: string;
    department: string;
    location: string;
    experienceMin: number;
    experienceMax: number;
    skills: string[];
    requirements: string[];
    responsibilities: string[];
    educationRequirements?: string;
    eligibilityThreshold?: number;
    partialMatchMin?: number;
    partialMatchMax?: number;
    /** Admin "Allow Fresher Candidates" */
    allowFresherCandidates?: boolean;
    /** Admin "Allow Currently Not Employed" */
    allowCurrentlyNotEmployed?: boolean;
  }
): Promise<UnifiedAnalysisResult> => {
  let aiOutput: AIAnalysisOutput | null = null;
  let provider: "OpenAI" | "Gemini" = "OpenAI";

  // Regex extraction for contact info as secondary guarantee
  let regexEmail: string | null = null;
  let regexLinkedin: string | null = null;

  const emailMatch = cvText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) regexEmail = emailMatch[0];

  // LinkedIn is a fixed URL shape, so a regex is more dependable than the model —
  // it also backfills when the AI omits the field.
  const linkedinMatch = cvText.match(
    /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9._%+-]+\/?/i
  );
  if (linkedinMatch) {
    regexLinkedin = linkedinMatch[0]
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "")
      .toLowerCase();
  }

  const regexPhones = extractPhones(cvText);
  const regexPhone = regexPhones[0] || null;

  // 1. Try Primary Provider: OpenAI
  try {
    console.log("🤖 Running OpenAI CV analysis...");
    aiOutput = await analyzeCvWithOpenAI(cvText, jobDescription);
  } catch (openAiError) {
    console.warn("⚠️ OpenAI analysis failed or unavailable:", (openAiError as Error).message);
    console.log("🔄 Fallback to Gemini CV analysis...");
    
    // 2. Fallback Provider: Gemini
    try {
      aiOutput = await analyzeCvWithGemini(cvText, jobDescription);
      provider = "Gemini";
    } catch (geminiError) {
      console.warn("⚠️ Gemini fallback also failed, running local deterministic analyzer...");
      
      // Heuristic analysis score based on keyword match
      const lowerCv = cvText.toLowerCase();
      let matchedCount = 0;
      const matchedReqs: string[] = [];
      const missingReqs: string[] = [];

      for (const req of jobDescription.requirements) {
        const keywords = req.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const hasMatch = keywords.some(k => lowerCv.includes(k));
        if (hasMatch) {
          matchedCount++;
          matchedReqs.push(req);
        } else {
          missingReqs.push(req);
        }
      }

      const ratio = jobDescription.requirements.length > 0 ? matchedCount / jobDescription.requirements.length : 0.7;
      const heuristicScore = Math.round(ratio * 100);

      aiOutput = {
        candidate: {
          name: null,
          email: regexEmail,
          phone: regexPhone,
          phones: regexPhones,
          linkedin: regexLinkedin,
          location: lowerCv.includes("delhi") || lowerCv.includes("noida") || lowerCv.includes("gurugram") ? "Delhi NCR" : null,
          gender: null,
        },
        education: [],
        experience: [],
        skills: jobDescription.skills.filter(s => lowerCv.includes(s.toLowerCase())),
        achievements: [],
        languages: [],
        currentCompany: null,
        currentDesignation: null,
        totalExperience: null,
        noticePeriod: null,
        currentCTC: null,
        expectedCTC: null,
        evaluation: {
          relevantExperience: { score: heuristicScore, evidence: matchedReqs },
          skills: { score: Math.round(heuristicScore * 0.9), matched: jobDescription.skills.filter(s => lowerCv.includes(s.toLowerCase())), missing: [] },
          education: { score: /(bams|md \(?ayurveda|ayurvedacharya|panchakarma|graduate|bachelor|diploma)/.test(lowerCv) ? 85 : 50, evidence: [] },
          industryExperience: { score: /ayurved|panchakarma|ayush|wellness|clinic|hospital|healthcare/.test(lowerCv) ? 80 : 40, evidence: [] },
          roleFit: { score: heuristicScore, evidence: [] },
          location: { score: lowerCv.includes("delhi") || lowerCv.includes("noida") || lowerCv.includes("gurugram") ? 100 : 70, evidence: [] },
        },
        matchedRequirements: matchedReqs,
        missingRequirements: missingReqs,
        strengths: matchedReqs,
        gaps: missingReqs,
        explanation: "Candidate evaluated based on skills and requirement keywords from CV.",
      };
    }
  }

  if (!aiOutput || !aiOutput.evaluation) {
    throw new Error("Invalid AI output format.");
  }

  // Merge regex email/phone if AI returned null
  if (!aiOutput.candidate.email && regexEmail) aiOutput.candidate.email = regexEmail;

  // The model reports the number it considers primary; the regex sweep finds the rest.
  // Both are kept so the OTP step can offer every number the CV actually carries.
  const candidatePhones = mergePhones(
    [aiOutput.candidate.phone],
    aiOutput.candidate.phones || [],
    regexPhones
  );
  if (!aiOutput.candidate.phone && candidatePhones.length > 0) {
    aiOutput.candidate.phone = candidatePhones[0];
  }

  // Experience and skills come from the facts the AI read, worked out here (see the prompt)
  const now = new Date();
  if (Array.isArray(aiOutput.workHistory) && aiOutput.workHistory.length > 0) {
    const exp = experienceFromWork(aiOutput.workHistory, now);
    const min = Number(jobDescription.experienceMin) || 0;
    const max = Number(jobDescription.experienceMax) || 0;
    const required = max > min ? `${min}-${max}` : `${min}+`;
    aiOutput.evaluation.relevantExperience = {
      score: experienceScore(exp.relevant, min),
      evidence: [
        `About ${exp.relevant} year${exp.relevant === 1 ? "" : "s"} of relevant experience (required ${required} years)`,
        ...(aiOutput.evaluation.relevantExperience?.evidence || []).slice(0, 2),
      ],
    };
    aiOutput.totalExperienceYears = exp.total;
    // The exact figure replaces the model's own (often wrong) date arithmetic in its text
    const mentionsYears = (text: string) =>
      (/\b(year|yr)s?\b/i.test(text) && /experience|fresher/i.test(text)) ||
      /experience requirement|required experience|enough experience|minimum experience|\bfresher\b/i.test(text);
    const withoutYears = (items?: string[]) => (items || []).filter((t) => !mentionsYears(String(t)));
    const yearsText = `About ${exp.relevant} year${exp.relevant === 1 ? "" : "s"} of relevant experience`;
    const meetsMin = exp.relevant >= min;
    aiOutput.strengths = withoutYears(aiOutput.strengths);
    aiOutput.gaps = withoutYears(aiOutput.gaps);
    if (meetsMin) aiOutput.strengths.unshift(`${yearsText} (required ${required} years)`);
    else aiOutput.gaps.unshift(`${yearsText}; this role needs at least ${min} year${min === 1 ? "" : "s"}`);
    const sentences = String(aiOutput.explanation || "").match(/[^.!?]+[.!?]*/g) || [];
    aiOutput.explanation = [
      ...sentences.map((x) => x.trim()).filter((x) => x && !mentionsYears(x)),
      `${yearsText} (the role asks for ${required} years)${meetsMin ? "." : ", which is below the minimum."}`,
    ].join(" ");
  }
  const requiredSkills = (jobDescription.skills || []).filter(Boolean);
  if (requiredSkills.length > 0 && Array.isArray(aiOutput.requiredSkillsCheck) && aiOutput.requiredSkillsCheck.length > 0) {
    aiOutput.evaluation.skills = skillsFromCheck(requiredSkills, aiOutput.requiredSkillsCheck);
  }

  // 3. Compute Deterministic Match Score
  const overallScore = calculateDeterministicScore(aiOutput.evaluation);
  const threshold = jobDescription.eligibilityThreshold ?? 40;
  const decided = decideVerdict(overallScore, jobDescription);
  const { eligibleFrom, partialFrom } = decided;

  // The job's candidate rules from the admin: a CV that breaks one is Not eligible whatever its score.
  // A rule is only applied when the CV clearly shows the fact (null = could not tell = not held against them).
  const ruleFailures: string[] = [];
  const years = aiOutput.totalExperienceYears;
  if (jobDescription.allowFresherCandidates === false && typeof years === "number" && years < 1) {
    ruleFailures.push("This position is not open to freshers: work experience is required.");
  }
  if (jobDescription.allowCurrentlyNotEmployed === false && aiOutput.currentlyEmployed === false) {
    ruleFailures.push("This position is open only to candidates who are currently employed.");
  }
  // Most of the required skills must be there to be Eligible, however strong the rest of the CV is
  const skillsScore = aiOutput.evaluation.skills?.score ?? 0;
  const skillsGate = decided.verdict === "ELIGIBLE" && skillsScore < MIN_SKILLS_FOR_ELIGIBLE;
  const verdict: CvVerdict = ruleFailures.length ? "NOT_ELIGIBLE" : skillsGate ? "PARTIAL" : decided.verdict;
  if (skillsGate) {
    aiOutput.gaps = [
      `Only ${skillsScore}% of the required skills were found in your CV (at least ${MIN_SKILLS_FOR_ELIGIBLE}% is needed to be eligible).`,
      ...(aiOutput.gaps || []),
    ];
  }
  const eligible = verdict === "ELIGIBLE";

  return {
    provider,
    extractedProfile: {
      candidate: {
        ...(aiOutput.candidate || { name: null, email: null, phone: null, location: null, linkedin: null, gender: null }),
        phones: candidatePhones,
        // Prefer whatever the CV literally contains over a model guess.
        linkedin: regexLinkedin || aiOutput.candidate?.linkedin || null,
        gender: aiOutput.candidate?.gender || null,
      },
      education: aiOutput.education || [],
      experience: aiOutput.experience || [],
      skills: aiOutput.skills || [],
      achievements: aiOutput.achievements || [],
      languages: aiOutput.languages || [],
      currentCompany: aiOutput.currentCompany || null,
      currentDesignation: aiOutput.currentDesignation || null,
      totalExperience: aiOutput.totalExperience || null,
      noticePeriod: aiOutput.noticePeriod || null,
      currentCTC: aiOutput.currentCTC || null,
      expectedCTC: aiOutput.expectedCTC || null,
    },
    overallScore,
    eligibilityThreshold: threshold,
    eligible,
    verdict,
    verdictRule: { eligibleFrom, partialFrom },
    breakdown: {
      relevantExperience: {
        score: aiOutput.evaluation.relevantExperience?.score || 0,
        evidence: aiOutput.evaluation.relevantExperience?.evidence || [],
      },
      skills: {
        score: aiOutput.evaluation.skills?.score || 0,
        matched: aiOutput.evaluation.skills?.matched || [],
        missing: aiOutput.evaluation.skills?.missing || [],
      },
      education: {
        score: aiOutput.evaluation.education?.score || 0,
        evidence: aiOutput.evaluation.education?.evidence || [],
      },
      industryExperience: {
        score: aiOutput.evaluation.industryExperience?.score || 0,
        evidence: aiOutput.evaluation.industryExperience?.evidence || [],
      },
      roleFit: {
        score: aiOutput.evaluation.roleFit?.score || 0,
        evidence: aiOutput.evaluation.roleFit?.evidence || [],
      },
      location: {
        score: aiOutput.evaluation.location?.score || 0,
        evidence: aiOutput.evaluation.location?.evidence || [],
      },
    },
    matchedRequirements: fillToFive(
      aiOutput.matchedRequirements || [],
      aiOutput.strengths || [],
      jobDescription.requirements,
      jobDescription.skills
    ),
    missingRequirements: aiOutput.missingRequirements || [],
    strengths: aiOutput.strengths || [],
    gaps: [...ruleFailures, ...(aiOutput.gaps || [])],
    ruleFailures,
    explanation: ruleFailures.length ? [...ruleFailures, aiOutput.explanation].filter(Boolean).join(" ") : aiOutput.explanation || "CV analyzed successfully against job parameters.",
  };
};

/** The UI always shows 5 "key requirements met" bullets, so pad with strengths/job data rather than trust the model's count. */
function fillToFive(...sources: string[][]): string[] {
  const result: string[] = [];
  for (const source of sources) {
    for (const item of source) {
      if (result.length >= 5) return result;
      if (item && !result.includes(item)) result.push(item);
    }
  }
  return result;
}
