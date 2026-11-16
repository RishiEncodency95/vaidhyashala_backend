import { Request, Response } from "express";
import Application from "../../models/careers/Application.model";
import CandidateProfile from "../../models/careers/CandidateProfile.model";
import Job from "../../models/careers/Job.model";
import CvAnalysis from "../../models/careers/CvAnalysis.model";
import Counter from "../../models/careers/Counter.model";
import ApplicationEvent from "../../models/careers/ApplicationEvent.model";
import { sendCandidateConfirmationEmail, sendAdminNotificationEmail } from "../../services/email.service";
import { APPLICATION_STATUS_MESSAGE, jobApplicationStatus } from "./jobAvailability";

/** The job's screening questions paired with the candidate's answers (matched by position) */
const pairAnswers = (questions: string[] = [], answers: unknown): { question: string; answer: string }[] => {
  const given = Array.isArray(answers) ? answers : [];
  return questions.map((question, i) => {
    const a = given[i];
    const answer = typeof a === "string" ? a : typeof a?.answer === "string" ? a.answer : "";
    return { question, answer: answer.trim().slice(0, 2000) };
  });
};

/**
 * Generate unique, server-side sequential Application ID: BOE<current year>-000001
 */
export const generateNextApplicationId = async (): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "applicationId_seq" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(6, "0");
  const year = new Date().getFullYear();
  return `BOE${year}-${seqStr}`;
};

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { candidateId, jobId, cvAnalysisId, candidateData, whyInterested, screeningAnswers } = req.body;

    if (!jobId) {
      res.status(400).json({ success: false, message: "jobId is required." });
      return;
    }

    let job = /^[0-9a-fA-F]{24}$/.test(String(jobId)) ? await Job.findById(jobId) : null;
    if (!job) {
      job = await Job.findOne({ slug: String(jobId) });
    }

    if (!job || job.status === "DRAFT") {
      res.status(404).json({ success: false, message: "Job position not found." });
      return;
    }

    const applicationStatus = jobApplicationStatus(job);
    if (applicationStatus !== "OPEN") {
      res.status(403).json({ success: false, message: APPLICATION_STATUS_MESSAGE[applicationStatus], applicationStatus });
      return;
    }

    let candidate = candidateId ? await CandidateProfile.findById(candidateId) : null;
    if (!candidate) {
      // "CV Upload Mandatory" off: the candidate may apply with the form alone
      if (candidateId || job.cvUploadMandatory !== false) {
        res.status(candidateId ? 404 : 400).json({
          success: false,
          message: candidateId ? "Candidate profile not found." : "Please upload your CV to apply for this position.",
        });
        return;
      }
      if (!candidateData?.name || !candidateData?.email || !candidateData?.phone) {
        res.status(400).json({ success: false, message: "Please enter your name, email and phone number." });
        return;
      }
      candidate = new CandidateProfile({});
    }

    // Update candidate profile fields if user modified form
    if (candidateData) {
      if (candidateData.name) candidate.name = candidateData.name;
      if (candidateData.email) candidate.email = candidateData.email;
      if (candidateData.phone) candidate.phone = candidateData.phone;
      // Set on the eligibility screen: the photo the candidate added and every number
      // their CV listed, including the one the WhatsApp OTP proved.
      if (candidateData.photo) candidate.photo = candidateData.photo;
      if (candidateData.verifiedPhone) candidate.verifiedPhone = candidateData.verifiedPhone;
      if (Array.isArray(candidateData.phones) && candidateData.phones.length > 0) {
        candidate.phones = candidateData.phones;
      }
      if (candidateData.location) candidate.location = candidateData.location;
      if (candidateData.currentCompany !== undefined) candidate.currentCompany = candidateData.currentCompany;
      if (candidateData.currentDesignation !== undefined) candidate.currentDesignation = candidateData.currentDesignation;
      if (candidateData.totalExperience !== undefined) candidate.totalExperience = candidateData.totalExperience;
      if (candidateData.noticePeriod !== undefined) candidate.noticePeriod = candidateData.noticePeriod;
      if (candidateData.expectedCTC !== undefined) candidate.expectedCTC = candidateData.expectedCTC;
      if (candidateData.willingToRelocate !== undefined) candidate.willingToRelocate = candidateData.willingToRelocate;
      if (candidateData.skills) candidate.skills = candidateData.skills;
      if (candidateData.education) candidate.education = candidateData.education;
      await candidate.save();
    }

    // Check if draft or existing application exists
    let application = await Application.findOne({
      candidateId: candidate._id,
      jobId: job._id,
      status: { $in: ["DRAFT", "CV_UPLOADED", "AI_ANALYZING", "AI_COMPLETED", "APPLICATION_IN_PROGRESS"] },
    });

    if (!application) {
      const tempAppId = await generateNextApplicationId();
      application = await Application.create({
        applicationId: tempAppId,
        candidateId: candidate._id,
        jobId: job._id,
        cvAnalysisId: cvAnalysisId || undefined,
        status: "APPLICATION_IN_PROGRESS",
        whyInterested: whyInterested || "",
      });
    } else {
      if (cvAnalysisId) application.cvAnalysisId = cvAnalysisId;
      if (whyInterested) application.whyInterested = whyInterested;
    }
    if (screeningAnswers) application.screeningAnswers = pairAnswers(job.screeningQuestions, screeningAnswers);
    await application.save();

    res.status(200).json({
      success: true,
      message: "Application drafted successfully.",
      data: application,
    });
  } catch (error) {
    console.error("Create application error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process candidate application.",
      error: (error as Error).message,
    });
  }
};

export const getApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    let application = await Application.findOne({ applicationId: targetId })
      .populate("candidateId")
      .populate("jobId")
      .populate("cvAnalysisId");

    if (!application && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(targetId)
        .populate("candidateId")
        .populate("jobId")
        .populate("cvAnalysisId");
    }

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch application details.",
      error: (error as Error).message,
    });
  }
};

export const updateApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    const { candidateData, whyInterested, notes } = req.body;

    let application = await Application.findOne({ applicationId: targetId });
    if (!application && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(targetId);
    }

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    if (application.candidateId && candidateData) {
      await CandidateProfile.findByIdAndUpdate(application.candidateId, candidateData);
    }

    if (whyInterested !== undefined) application.whyInterested = whyInterested;
    if (notes !== undefined) application.notes = notes;

    await application.save();

    res.status(200).json({
      success: true,
      message: "Application details updated successfully.",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update application.",
      error: (error as Error).message,
    });
  }
};

export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    const { candidateData, whyInterested, screeningAnswers } = req.body;

    let application = await Application.findOne({ applicationId: targetId })
      .populate("candidateId")
      .populate("jobId")
      .populate("cvAnalysisId");

    if (!application && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(targetId)
        .populate("candidateId")
        .populate("jobId")
        .populate("cvAnalysisId");
    }

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    const candidate = await CandidateProfile.findById(application.candidateId);
    if (!candidate) {
      res.status(404).json({ success: false, message: "Candidate profile missing." });
      return;
    }

    const job = await Job.findById(application.jobId);
    const applicationStatus = job ? jobApplicationStatus(job) : "CLOSED";
    if (!job || applicationStatus !== "OPEN") {
      res.status(400).json({
        success: false,
        message: APPLICATION_STATUS_MESSAGE[applicationStatus === "OPEN" ? "CLOSED" : applicationStatus],
      });
      return;
    }

    // Apply any final form field updates
    if (candidateData) {
      if (candidateData.name) candidate.name = candidateData.name;
      if (candidateData.email) candidate.email = candidateData.email;
      if (candidateData.phone) candidate.phone = candidateData.phone;
      // Set on the eligibility screen: the photo the candidate added and every number
      // their CV listed, including the one the WhatsApp OTP proved.
      if (candidateData.photo) candidate.photo = candidateData.photo;
      if (candidateData.verifiedPhone) candidate.verifiedPhone = candidateData.verifiedPhone;
      if (Array.isArray(candidateData.phones) && candidateData.phones.length > 0) {
        candidate.phones = candidateData.phones;
      }
      if (candidateData.location) candidate.location = candidateData.location;
      if (candidateData.currentCompany !== undefined) candidate.currentCompany = candidateData.currentCompany;
      if (candidateData.currentDesignation !== undefined) candidate.currentDesignation = candidateData.currentDesignation;
      if (candidateData.totalExperience !== undefined) candidate.totalExperience = candidateData.totalExperience;
      if (candidateData.noticePeriod !== undefined) candidate.noticePeriod = candidateData.noticePeriod;
      if (candidateData.expectedCTC !== undefined) candidate.expectedCTC = candidateData.expectedCTC;
      if (candidateData.willingToRelocate !== undefined) candidate.willingToRelocate = candidateData.willingToRelocate;
      if (candidateData.skills) candidate.skills = candidateData.skills;
      // Skills the candidate added on the application form, on top of those read from the CV
      if (Array.isArray(candidateData.extraSkills)) {
        const extra = candidateData.extraSkills.map((x: unknown) => String(x ?? "").trim().slice(0, 80)).filter(Boolean).slice(0, 30);
        candidate.skills = [...new Set([...(candidate.skills || []), ...extra])];
      }
      if (candidateData.education) candidate.education = candidateData.education;
      await candidate.save();
    }

    if (whyInterested) {
      application.whyInterested = whyInterested;
    }

    // Validate essential contact fields
    if (!candidate.name || !candidate.email || !candidate.phone) {
      res.status(400).json({
        success: false,
        message: "Please complete candidate Name, Email, and Phone before submitting.",
      });
      return;
    }

    // "Candidate Photo Mandatory": a photo from the CV counts; otherwise the candidate must add one
    if (job.candidatePhotoMandatory !== false && !candidate.photo) {
      res.status(400).json({ success: false, message: "Please add your photo before submitting.", field: "photo" });
      return;
    }

    // Every application question set on the job must be answered
    if (screeningAnswers) application.screeningAnswers = pairAnswers(job.screeningQuestions, screeningAnswers);
    const answers = application.screeningAnswers || [];
    const unanswered = (job.screeningQuestions || []).filter((q: string, i: number) => !answers[i]?.answer?.trim());
    if (unanswered.length) {
      res.status(400).json({
        success: false,
        message: `Please answer all application questions (${unanswered.length} left).`,
        field: "screeningAnswers",
      });
      return;
    }

    const analysis = application.cvAnalysisId
      ? await CvAnalysis.findById(application.cvAnalysisId)
      : null;

    // Freeze candidate and score snapshot
    application.candidateSnapshot = candidate.toObject();
    application.scoreSnapshot = analysis
      ? {
          matchScore: analysis.matchScore,
          eligibilityThreshold: analysis.eligibilityThreshold,
          eligible: analysis.eligible,
          breakdown: analysis.breakdown,
          matchedRequirements: analysis.matchedRequirements,
          missingRequirements: analysis.missingRequirements,
          strengths: analysis.strengths,
          gaps: analysis.gaps,
        }
      : { matchScore: 0, eligible: false, screened: false };

    const oldStatus = application.status;
    application.status = "SUBMITTED";
    application.submittedAt = new Date();
    await application.save();

    // Create Audit Log Event
    await ApplicationEvent.create({
      applicationId: application.applicationId,
      oldStatus,
      newStatus: "SUBMITTED",
      changedBy: candidate.name || "Candidate",
      note: "Application submitted successfully by candidate.",
    });

    // Send confirmation email asynchronously
    const emailOpts = {
      recipientEmail: candidate.email,
      candidateName: candidate.name,
      jobTitle: job.title,
      applicationId: application.applicationId,
      matchScore: analysis ? analysis.matchScore : 0,
      submittedAt: application.submittedAt,
    };

    // Score and breakdown only when the job shows them to candidates (as on the website result)
    const showScore = !!analysis && analysis.status === "COMPLETED" && job.showMatchScoreToCandidate !== false;
    const verdict = analysis?.verdict ?? (analysis?.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE");
    sendCandidateConfirmationEmail({
      ...emailOpts,
      preferredLocation: job.location || candidate.location || "",
      screening: showScore
        ? {
            score: analysis.matchScore,
            verdict,
            breakdown:
              job.showMatchBreakdown !== false
                ? Object.entries(analysis.toObject().breakdown || {}).map(([key, area]: [string, any]) => ({ key, score: Number(area?.score) || 0 }))
                : null,
          }
        : null,
    }).catch((err) => console.error("Candidate email background send error:", err));

    sendAdminNotificationEmail(emailOpts).catch((err) =>
      console.error("Admin email background send error:", err)
    );

    res.status(200).json({
      success: true,
      message: "Application submitted successfully.",
      data: {
        applicationId: application.applicationId,
        status: "SUBMITTED",
        submittedAt: application.submittedAt,
      },
    });
  } catch (error) {
    console.error("Submit application error:", error);
    res.status(500).json({
      success: false,
      message: "Submission failed. Please try again.",
      error: (error as Error).message,
    });
  }
};

// ADMIN CONTROLLERS

export const getAdminApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, jobId, search } = req.query;
    const filter: any = {};

    if (status && status !== "ALL") {
      filter.status = String(status);
    }

    if (jobId && jobId !== "ALL") {
      filter.jobId = jobId;
    }

    const applications = await Application.find(filter)
      .populate("candidateId")
      .populate("jobId")
      .populate("cvAnalysisId")
      .sort({ createdAt: -1 });

    let filtered = applications;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = applications.filter((app: any) => {
        const candidateName = app.candidateId?.name?.toLowerCase() || "";
        const candidateEmail = app.candidateId?.email?.toLowerCase() || "";
        const appId = app.applicationId?.toLowerCase() || "";
        const jobTitle = app.jobId?.title?.toLowerCase() || "";
        return (
          candidateName.includes(q) ||
          candidateEmail.includes(q) ||
          appId.includes(q) ||
          jobTitle.includes(q)
        );
      });
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin applications.",
      error: (error as Error).message,
    });
  }
};

export const getAdminApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    let application = await Application.findOne({ applicationId: targetId })
      .populate("candidateId")
      .populate("jobId")
      .populate("cvAnalysisId");

    if (!application && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(targetId)
        .populate("candidateId")
        .populate("jobId")
        .populate("cvAnalysisId");
    }

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    const events = await ApplicationEvent.find({
      applicationId: application.applicationId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        application,
        events,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch application.",
      error: (error as Error).message,
    });
  }
};

export const updateAdminApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    const { status, note, changedBy } = req.body;

    let application = await Application.findOne({ applicationId: targetId });
    if (!application && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(targetId);
    }

    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    const oldStatus = application.status;
    application.status = status;
    await application.save();

    await ApplicationEvent.create({
      applicationId: application.applicationId,
      oldStatus,
      newStatus: status,
      changedBy: changedBy || "Admin",
      note: note || `Status updated to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update application status.",
      error: (error as Error).message,
    });
  }
};
