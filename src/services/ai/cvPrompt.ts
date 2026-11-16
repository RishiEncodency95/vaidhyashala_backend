import { COMPANY_CONTEXT } from "./aiConfig";

export interface CvJobInput {
  title: string;
  department: string;
  location: string;
  experienceMin: number;
  experienceMax: number;
  skills: string[];
  requirements: string[];
  responsibilities: string[];
  educationRequirements?: string;
}

export const CV_SYSTEM_PROMPT = "You are a precise, unbiased JSON-only recruitment assistant. You score only from evidence in the CV.";

/**
 * The CV screening prompt, shared by OpenAI and Gemini. The AI reads facts from the CV and scores the
 * softer areas against a fixed rubric. Experience years and the skills match are then worked out in code
 * from the work periods and the per-skill check it returns (see scoreFromFacts in ai.service), because
 * models are unreliable at date arithmetic and at counting. The final score uses fixed weights.
 */
export const buildCvAnalysisPrompt = (cvText: string, job: CvJobInput) => {
  const today = new Date().toISOString().slice(0, 7);
  return `You screen CVs for ${COMPANY_CONTEXT}
Compare the candidate CV below with the job and return the JSON described at the end.

JUDGE THE CANDIDATE AGAINST THIS JOB, NOT AGAINST THE CLINIC'S MEDICAL WORK.
The clinic also hires for non-clinical roles (software / web development, IT, marketing, accounts, HR, operations, front desk).
For such roles, Ayurveda or healthcare experience is NOT required: experience in the same kind of work in any industry is fully relevant
(e.g. a full stack developer at a software company is relevant experience for a web developer role here).

Today is ${today}. Use it for any job marked "present", "current" or "till date".

CRITICAL INSTRUCTIONS:
1. NEVER invent or guess information. If email, phone, location, currentCompany, currentDesignation, totalExperience, noticePeriod, currentCTC, expectedCTC or gender are NOT explicitly stated in the CV, return null.
2. Return ONLY a strictly valid JSON object with EXACTLY the structure below.
3. For skills, include ONLY skills explicitly found in the CV text.
4. "workHistory": EVERY job, internship, freelance or founder role in the CV, with start and end as "YYYY-MM" (end "present" if ongoing).
   If only a year is given use "YYYY-01" for a start and "YYYY-12" for an end. Skip a role whose dates are not given at all.
   "relevant": "yes" when the work is the same kind of work as this job (same function and duties), in any industry;
   "partial" when it is a neighbouring function that shares only some of the duties (e.g. full stack development for a DevOps role,
   a general physician for an Ayurvedic doctor role, sales for a marketing role); "no" otherwise.
   "internship": true for internships, trainee or apprentice roles and academic projects.
5. "requiredSkillsCheck": one entry for EACH required skill of the job, in the same order:
   "yes" = the CV clearly shows it (listed, or used in a project or job; obvious equivalents count, e.g. "HTML, CSS" for "HTML/CSS", building websites for "Web Development");
   "partial" = closely related evidence only; "no" = not shown.
6. Score these areas from 0 to 100 using ONLY facts in the CV:
   - education: the required qualification (${job.educationRequirements || "relevant qualification"}).
       Meets or exceeds the required level in a suitable field: 85-100 (a completed or about-to-complete degree counts; e.g. B.Tech / B.Sc / B.Com is a graduate degree).
       For doctor roles the medical degree and registration are needed (e.g. BAMS / MD Ayurveda with State Board / NCISM registration).
       Lower level or unrelated field: 40-84 | not stated: 0-39.
   - industryExperience: experience in the field this job belongs to (for clinical roles: Ayurveda, Panchakarma, AYUSH, wellness, hospitals or clinics;
       for other roles: that function in any industry, e.g. software companies for a developer).
       Directly in that field: 80-100 | a neighbouring field: 50-79 | unrelated: 0-49.
   - roleFit: how closely past duties and projects match this job's responsibilities and level (for a junior role, strong projects count).
   - location: ${job.location}. Based there or explicitly willing to relocate: 90-100 | same state / nearby city: 60-89 | elsewhere: 20-59 | not stated: 50.
   - relevantExperience and skills: give your own estimate too; the system recomputes them from workHistory and requiredSkillsCheck.
7. Every score must have 1-3 short evidence points quoting or paraphrasing the CV. If there is no evidence, say so.
8. "explanation": 2-3 sentences giving the main reasons for the result, in plain words the candidate can understand.
9. Do NOT state the candidate's number of years of experience in strengths, gaps or explanation: the system adds the exact figure from workHistory.

JOB:
- Title: ${job.title}
- Department: ${job.department}
- Location: ${job.location}
- Experience Range: ${job.experienceMin} - ${job.experienceMax} years
- Education Required: ${job.educationRequirements || "Relevant qualification"}
- Required Skills: ${job.skills.join(", ") || "Not specified"}
- Key Responsibilities: ${job.responsibilities.join("; ") || "Not specified"}
- Key Requirements: ${job.requirements.join("; ") || "Not specified"}

CANDIDATE CV TEXT:
"""
${cvText}
"""

REQUIRED JSON RESPONSE STRUCTURE:
{
  "candidate": {
    "name": "Full Name with a space between First and Last Name (e.g. 'Ritu Verma'), in Title Case even if the CV writes it in capitals, or null",
    "email": "Email Address or null",
    "phone": "Primary phone number exactly as written in the CV, or null",
    "phones": ["EVERY phone number written anywhere in the CV, in the order they appear — include alternate/secondary numbers; empty array if none"],
    "location": "Current City/Location or null",
    "linkedin": "LinkedIn profile URL or handle exactly as written in the CV, or null",
    "gender": "'male' or 'female' ONLY if the CV has an explicit gender/sex field stating it — never inferred from the name, otherwise null"
  },
  "education": ["Degree/Institution listed in CV"],
  "experience": ["Work history/role listed in CV"],
  "skills": ["Explicitly listed skills"],
  "achievements": ["Key achievements"],
  "languages": ["Languages known"],
  "currentCompany": "Company name or null",
  "currentDesignation": "Current job title or null",
  "totalExperience": "Years/months of total experience e.g. '5 Years' or null",
  "totalExperienceYears": "Total years of paid work after studies as a number (e.g. 4.5); 0 if the CV shows no work experience (a fresher; internships and training do not count); null only if it cannot be told",
  "currentlyEmployed": "true if the CV shows a job the candidate holds now (e.g. 'Present', 'till date', 'currently working'); false if every job has ended or there is none; null if it cannot be told",
  "noticePeriod": "Notice period e.g. '30 Days' or null",
  "currentCTC": "Current salary/CTC exactly as stated in the CV, or null if not mentioned",
  "expectedCTC": "Expected salary/CTC or null",
  "workHistory": [
    { "title": "Ayurvedic Physician", "company": "Example Ayurveda Clinic", "start": "2021-04", "end": "present", "relevant": "yes", "internship": false }
  ],
  "requiredSkillsCheck": [
    { "skill": "Panchakarma", "status": "yes", "evidence": "Planned Panchakarma therapies for patients" }
  ],
  "evaluation": {
    "relevantExperience": { "score": 85, "evidence": ["5 years as Ayurvedic Physician at a Delhi clinic"] },
    "skills": { "score": 75, "matched": ["Panchakarma", "Nadi Pariksha"], "missing": ["Kshara Sutra"] },
    "education": { "score": 95, "evidence": ["BAMS (2016), MD Ayurveda (Kayachikitsa)"] },
    "industryExperience": { "score": 90, "evidence": ["All experience in Ayurvedic clinics"] },
    "roleFit": { "score": 80, "evidence": ["Handled patient consultations and Panchakarma planning"] },
    "location": { "score": 100, "evidence": ["Based in New Delhi"] }
  },
  "matchedRequirements": ["BAMS degree", "2+ years clinical practice"],
  "missingRequirements": ["State Board registration not mentioned"],
  "strengths": ["Strong Panchakarma planning experience", "Based in Delhi NCR"],
  "gaps": ["No mention of NCISM / State Board registration"],
  "explanation": "Two or three sentences on why the candidate does or does not match this job."
}`;
};
