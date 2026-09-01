const sqlModels = require("../models/sql");
const fs = require("fs/promises");
const path = require("path");
const { Op } = require("sequelize");
const { ROLES } = require("../constants/roles");
const { ResumeData } = require("../models/mongo/ResumeData");
const { extractTextFromFile, preprocessText, biasMinimize, calculateWeightedScore } = require("../nlp/ruleBasedNlp");
const { writeAuditLog } = require("../services/auditService");
const { sendInterviewScheduledEmail, sendPipelineEmail } = require("../services/emailService");
const { ApiError } = require("../errors/ApiError");

async function submitPreferredSlot(_req, _res) {
  throw new ApiError(410, "Candidate preference flow was replaced. Wait for recruiter-offered slots, then select one.");
}

async function analyzeResume(req, res) {
  const { jobProfileId } = req.body;
  const JobProfile = sqlModels.JobProfile;
  const Application = sqlModels.Application;
  const User = sqlModels.User;
  const resumeFile = req.file;
  let keepUploadedFile = false;

  try {
    if (!resumeFile) throw new ApiError(400, "Resume file is required.");
    if (!jobProfileId) throw new ApiError(400, "jobProfileId is required.");

    const jobProfile = await JobProfile.findByPk(jobProfileId);
    if (!jobProfile) throw new ApiError(404, "Job profile not found.");

    const existingApplication = await Application.findOne({
      where: { candidate_id: req.user.id, job_profile_id: Number(jobProfileId) }
    });
    if (existingApplication) {
      throw new ApiError(409, "You already applied to this job profile.");
    }

    const application = await Application.create({
      candidate_id: req.user.id,
      recruiter_id: jobProfile.recruiter_id,
      job_profile_id: Number(jobProfileId),
      status: "APPLIED"
    });

    const fileBuffer = await fs.readFile(resumeFile.path);
    const extracted = await extractTextFromFile({
      mimeType: resumeFile.mimetype,
      fileBuffer
    });

    const { scrubbedText } = await biasMinimize(extracted.rawExtractedText);
    const { preprocessedText } = await preprocessText(scrubbedText);
    const score = await calculateWeightedScore({
      preprocessedText,
      jobSkillsWeights: jobProfile.required_skills || {}
    });

    const doc = await ResumeData.create({
      mysql_user_id: req.user.id,
      job_profile_id: Number(jobProfileId),
      file_url: `/uploads/resumes/${path.basename(resumeFile.path)}`,
      stored_file_path: resumeFile.path,
      original_file_name: resumeFile.originalname,
      mime_type: resumeFile.mimetype,
      file_size_bytes: resumeFile.size,
      raw_extracted_text: extracted.rawExtractedText,
      preprocessed_text: preprocessedText,
      matched_skills: score.matchedSkills,
      missing_skills: score.missingSkills,
      overall_match_percentage: score.overallMatchPercentage
    });
    keepUploadedFile = true;

    await writeAuditLog({ userIdentity: req.user.email, actionPerformed: `ANALYZED_RESUME:${doc._id}` });
    await writeAuditLog({
      userIdentity: req.user.email,
      actionPerformed: `CREATED_APPLICATION:${application.id}`
    });

    const recruiter = await User.findByPk(jobProfile.recruiter_id, { attributes: ["email"] });
    const recipients = [req.user.email, recruiter?.email].filter(Boolean);
    for (const to of recipients) {
      try {
        await sendPipelineEmail({
          to,
          subject: "Application Submitted - Hire Flow",
          text: `A new application has been submitted.\nCandidate: ${req.user.email}\nJob: ${jobProfile.title}\nApplication ID: ${application.id}`
        });
      } catch (_mailErr) {
        await writeAuditLog({
          userIdentity: req.user.email,
          actionPerformed: `APPLICATION_EMAIL_FAILED:${application.id}:${to}`
        });
      }
    }

    return res.status(201).json({ application, resume: doc });
  } catch (err) {
    if (resumeFile?.path && !keepUploadedFile) {
      await fs.unlink(resumeFile.path).catch(() => undefined);
    }
    throw err;
  }
}

async function myInterviews(req, res) {
  const Interview = sqlModels.Interview;
  const User = sqlModels.User;
  const interviews = await Interview.findAll({
    where: { candidate_id: req.user.id },
    include: [{ model: User, as: "recruiter", attributes: ["id", "email"] }],
    order: [["scheduled_time", "ASC"]]
  });
  return res.json(interviews);
}

async function myApplication(req, res) {
  const Application = sqlModels.Application;
  const JobProfile = sqlModels.JobProfile;
  const row = await Application.findOne({
    where: { candidate_id: req.user.id },
    include: [{ model: JobProfile, as: "jobProfile", attributes: ["id", "title", "status"] }],
    order: [["created_at", "DESC"]]
  });
  return res.json(row);
}

async function myApplications(req, res) {
  const Application = sqlModels.Application;
  const JobProfile = sqlModels.JobProfile;
  const User = sqlModels.User;
  const rows = await Application.findAll({
    where: { candidate_id: req.user.id },
    include: [
      { model: JobProfile, as: "jobProfile", attributes: ["id", "title", "status"] },
      { model: User, as: "recruiter", attributes: ["id", "email"] }
    ],
    order: [["created_at", "DESC"]]
  });
  return res.json(rows);
}

async function getOfferedSlots(req, res) {
  const SlotOffer = sqlModels.SlotOffer;
  const where = { candidate_id: req.user.id, status: "OFFERED" };
  const { applicationId } = req.query;
  if (applicationId) where.application_id = Number(applicationId);
  const rows = await SlotOffer.findAll({
    where,
    order: [["scheduled_time", "ASC"]]
  });
  return res.json(rows);
}

async function selectOfferedSlot(req, res) {
  const SlotOffer = sqlModels.SlotOffer;
  const Application = sqlModels.Application;
  const Interview = sqlModels.Interview;
  const User = sqlModels.User;
  const { slotOfferId, meetingLink } = req.body;
  if (!slotOfferId) throw new ApiError(400, "slotOfferId is required.");

  const slot = await SlotOffer.findOne({
    where: { id: Number(slotOfferId), candidate_id: req.user.id }
  });
  if (!slot || slot.status !== "OFFERED") throw new ApiError(404, "Offered slot not found.");

  const application = await Application.findByPk(slot.application_id);
  if (!application) throw new ApiError(404, "Application not found.");
  if (application.status !== "SLOT_ASSIGNED") {
    throw new ApiError(409, "You can select a slot only after recruiter assigns slots.");
  }

  await SlotOffer.update(
    { status: "CANCELLED" },
    {
      where: {
        application_id: slot.application_id,
        id: { [Op.ne]: slot.id },
        status: "OFFERED"
      }
    }
  );
  slot.status = "SELECTED";
  await slot.save();

  const interview = await Interview.create({
    candidate_id: req.user.id,
    recruiter_id: slot.recruiter_id,
    scheduled_time: slot.scheduled_time,
    meeting_link: String(meetingLink || "").trim(),
    status: "SCHEDULED"
  });

  application.status = "SLOT_SELECTED";
  await application.save();
  await writeAuditLog({
    userIdentity: req.user.email,
    actionPerformed: `SELECTED_SLOT:${slot.id}:INTERVIEW:${interview.id}`
  });

  const candidate = await User.findByPk(req.user.id, { attributes: ["email"] });
  const recruiter = await User.findByPk(slot.recruiter_id, { attributes: ["email"] });
  const recipients = [candidate?.email, recruiter?.email].filter(Boolean);
  for (const to of recipients) {
    try {
      await sendInterviewScheduledEmail({
        to,
        candidateEmail: candidate?.email || "candidate",
        recruiterEmail: recruiter?.email || "recruiter",
        scheduledTime: interview.scheduled_time,
        meetingLink: interview.meeting_link
      });
    } catch (_mailErr) {
      await writeAuditLog({
        userIdentity: req.user.email,
        actionPerformed: `INTERVIEW_EMAIL_FAILED:${interview.id}:${to}`
      });
    }
  }

  return res.status(201).json(interview);
}

async function listOpenJobProfiles(req, res) {
  const JobProfile = sqlModels.JobProfile;
  const rows = await JobProfile.findAll({
    where: { status: "Open" },
    attributes: ["id", "title", "recruiter_id"],
    order: [["id", "DESC"]]
  });
  return res.json(rows);
}

async function listRecruiters(req, res) {
  const User = sqlModels.User;
  const rows = await User.findAll({
    where: { role: ROLES.RECRUITER },
    attributes: ["id", "email"],
    order: [["id", "DESC"]]
  });
  return res.json(rows);
}

module.exports = {
  submitPreferredSlot,
  analyzeResume,
  myInterviews,
  myApplication,
  myApplications,
  getOfferedSlots,
  selectOfferedSlot,
  listOpenJobProfiles,
  listRecruiters
};
