import type { QueryFilter } from "mongoose";
import type { IJob } from "../../models/careers/Job.model";

/**
 * Whether candidates can apply to a job right now, from the job's admin settings:
 *   OPEN           applications are accepted
 *   NOT_YET_OPEN   before the Application Open Date
 *   CLOSED         closed / draft, or after the Application Closing Date
 *   NOT_ACCEPTING  "Accept Online Applications" is off
 */
export type JobApplicationStatus = "OPEN" | "NOT_YET_OPEN" | "CLOSED" | "NOT_ACCEPTING";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The closing date is a whole day: applications stay open until that day ends */
const closesAt = (closing: Date) => new Date(closing).getTime() + DAY_MS;

export const jobApplicationStatus = (job: Partial<IJob>, now = new Date()): JobApplicationStatus => {
  if (job.status !== "OPEN") return "CLOSED";
  if (job.applicationClosingDate && closesAt(job.applicationClosingDate) <= now.getTime()) return "CLOSED";
  if (job.applicationOpenDate && new Date(job.applicationOpenDate).getTime() > now.getTime()) return "NOT_YET_OPEN";
  if (job.acceptOnlineApplications === false) return "NOT_ACCEPTING";
  return "OPEN";
};

/** Candidate-facing reason when a job cannot take applications */
export const APPLICATION_STATUS_MESSAGE: Record<Exclude<JobApplicationStatus, "OPEN">, string> = {
  NOT_YET_OPEN: "Applications for this position have not opened yet.",
  CLOSED: "Applications for this position are closed.",
  NOT_ACCEPTING: "This position is not accepting online applications.",
};

/** Jobs shown on the website Careers page: open, listed, and inside their application dates */
export const listedJobsFilter = (now = new Date()): QueryFilter<IJob> => ({
  status: "OPEN",
  websiteVisibility: { $ne: "UNLISTED" },
  $and: [
    { $or: [{ applicationOpenDate: null }, { applicationOpenDate: { $lte: now } }] },
    { $or: [{ applicationClosingDate: null }, { applicationClosingDate: { $gt: new Date(now.getTime() - DAY_MS) } }] },
  ],
});
