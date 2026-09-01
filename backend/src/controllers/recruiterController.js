const { Op } = require("sequelize");
const path = require("path");
const sqlModels = require("../models/sql");
const { ResumeData } = require("../models/mongo/ResumeData");
const { ApiError } = require("../errors/ApiError");
const { writeAuditLog } = require("../services/auditService");
const { sendPipelineEmail } = require("../services/emailService");

function sanitizeSkillWeights(input) {
  const entries = Object.entries(input || {}).filter(([k, v]) => {
    return String(k || "").trim().length > 0 && Number(v) > 0;
  });
  if (entries.length === 0) throw new ApiError(400, "requiredSkills must contain at least one positive weight.");

  return Object.fromEntries(entries.map(([k, v]) => [String(k).trim(), Number(v)]));
}

async function createJobProfile(req, res) {
  const JobProfile = sqlModels.JobProfile;
  const { title, requiredSkills, status } = req.body;
  if (!title) throw new ApiError(400, "title is required.");

  const profile = await JobProfile.create({
    recruiter_id: req.user.id,
    title: String(title).trim(),
    required_skills: sanitizeSkillWeights(requiredSkills),
    status: status === "Closed" ? "Closed" : "Open"
  });

  await writeAuditLog({ userIdentity: req.user.email, actionPerformed: `CREATED_JOB_PROFILE:${profile.id}` });
  return res.status(201).json(profile);
}

async function getRankedCandidates(req, res) {
  const JobProfile = sqlModels.JobProfile;
  const User = sqlModels.User;
  const { page = 1, pageSize = 20 } = req.query;
  const p = Math.max(1, Number(page));
  const size = Math.min(100, Math.max(1, Number(pageSize)));

  const recruiterJobs = await JobProfile.findAll({
    where: { recruiter_id: req.user.id },
    attributes: ["id"]
  });
  const jobIds = recruiterJobs.map((j) => j.id);
  if (jobIds.length === 0) return res.json([]);

  const docs = await ResumeData.find({ job_profile_id: { $in: jobIds } })
    .sort({ overall_match_percentage: -1, createdAt: -1 })
    .skip((p - 1) * size)
    .limit(size)
    .lean();

  const candidateIds = [...new Set(docs.map((d) => d.mysql_user_id))];
  const users = candidateIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: candidateIds } },
        attributes: ["id", "email"]
      })
    : [];
  const usersById = new Map(users.map((u) => [u.id, u]));

  const ranked = docs.map((doc) => {
    const candidate = usersById.get(doc.mysql_user_id);
    return {
      ...doc,
      candidate: {
        id: doc.mysql_user_id,
        email: candidate?.email || null
      }
    };
  });

  return res.json(ranked);
}

async function candidatePreferences(req, res) {
  const Application = sqlModels.Application;
  const SlotOffer = sqlModels.SlotOffer;
  const JobProfile = sqlModels.JobProfile;
  const User = sqlModels.User;
  const rows = await Application.findAll({
    where: { recruiter_id: req.user.id },
    include: [
      { model: User, as: "candidate", attributes: ["id", "email"] },
      { model: JobProfile, as: "jobProfile", attributes: ["id", "title"] },
      { model: SlotOffer, as: "slotOffers", required: false }
    ],
    order: [["created_at", "DESC"]]
  });
  return res.json(rows);
}

async function finalizeInterview(req, res) {
  throw new ApiError(410, "Direct finalize is disabled. Recruiter must shortlist and offer slots first.");
}

async function shortlistApplication(req, res) {
  const Application = sqlModels.Application;
  const User = sqlModels.User;
  const { applicationId } = req.params;
  const app = await Application.findByPk(Number(applicationId));
  if (!app || app.recruiter_id !== req.user.id) throw new ApiError(404, "Application not found.");
  if (app.status !== "APPLIED") throw new ApiError(409, "Only APPLIED applications can be shortlisted.");
  app.status = "SHORTLISTED";
  await app.save();
  await writeAuditLog({
    userIdentity: req.user.email,
    actionPerformed: `SHORTLISTED_APPLICATION:${app.id}`
  });
  const candidate = await User.findByPk(app.candidate_id, { attributes: ["email"] });
  if (candidate?.email) {
    try {
      await sendPipelineEmail({
        to: candidate.email,
        subject: "Application Shortlisted - Hire Flow",
        text: `Good news. Your application #${app.id} has been shortlisted by recruiter ${req.user.email}.`
      });
    } catch (_mailErr) {
      await writeAuditLog({
        userIdentity: req.user.email,
        actionPerformed: `SHORTLIST_EMAIL_FAILED:${app.id}:${candidate.email}`
      });
    }
  }
  return res.json(app);
}

async function assignSlots(req, res) {
  const Application = sqlModels.Application;
  const SlotOffer = sqlModels.SlotOffer;
  const Interview = sqlModels.Interview;
  const User = sqlModels.User;
  const { applicationId } = req.params;
  const { slotTimesIso = [] } = req.body;

  if (!Array.isArray(slotTimesIso) || slotTimesIso.length === 0) {
    throw new ApiError(400, "slotTimesIso must be a non-empty array.");
  }
  const app = await Application.findByPk(Number(applicationId));
  if (!app || app.recruiter_id !== req.user.id) throw new ApiError(404, "Application not found.");
  if (app.status !== "SHORTLISTED") {
    throw new ApiError(409, "Slots can be assigned only after shortlisting.");
  }

  const normalizedTimes = slotTimesIso.map((t) => new Date(String(t)));
  if (normalizedTimes.some((d) => Number.isNaN(d.getTime()))) {
    throw new ApiError(400, "All slotTimesIso values must be valid ISO dates.");
  }

  for (const scheduledTime of normalizedTimes) {
    const recruiterConflict = await Interview.findOne({
      where: { recruiter_id: req.user.id, scheduled_time: { [Op.eq]: scheduledTime }, status: "SCHEDULED" }
    });
    if (recruiterConflict) throw new ApiError(409, `Recruiter conflict at ${scheduledTime.toISOString()}.`);
  }

  await SlotOffer.update({ status: "CANCELLED" }, { where: { application_id: app.id, status: "OFFERED" } });
  const payload = normalizedTimes.map((d) => ({
    application_id: app.id,
    candidate_id: app.candidate_id,
    recruiter_id: req.user.id,
    scheduled_time: d,
    status: "OFFERED"
  }));
  const rows = await SlotOffer.bulkCreate(payload);
  app.status = "SLOT_ASSIGNED";
  await app.save();
  await writeAuditLog({
    userIdentity: req.user.email,
    actionPerformed: `ASSIGNED_SLOTS:${app.id}:${rows.length}`
  });
  const candidate = await User.findByPk(app.candidate_id, { attributes: ["email"] });
  if (candidate?.email) {
    try {
      await sendPipelineEmail({
        to: candidate.email,
        subject: "Interview Slots Available - Hire Flow",
        text: `Recruiter ${req.user.email} assigned ${rows.length} interview slot(s) for your application #${app.id}.`
      });
    } catch (_mailErr) {
      await writeAuditLog({
        userIdentity: req.user.email,
        actionPerformed: `SLOT_ASSIGN_EMAIL_FAILED:${app.id}:${candidate.email}`
      });
    }
  }
  return res.status(201).json(rows);
}

async function downloadResume(req, res) {
  const JobProfile = sqlModels.JobProfile;
  const { resumeId } = req.params;
  const doc = await ResumeData.findById(resumeId).lean();
  if (!doc) throw new ApiError(404, "Resume not found.");
  if (!doc.stored_file_path) throw new ApiError(404, "Stored resume file path missing.");

  const job = await JobProfile.findByPk(Number(doc.job_profile_id), { attributes: ["id", "recruiter_id"] });
  if (!job || Number(job.recruiter_id) !== Number(req.user.id)) {
    throw new ApiError(403, "You can download resumes only for your own job profiles.");
  }
  await writeAuditLog({
    userIdentity: req.user.email,
    actionPerformed: `DOWNLOADED_RESUME:${resumeId}`
  });

  return res.download(path.resolve(doc.stored_file_path), doc.original_file_name || "resume");
}

module.exports = {
  createJobProfile,
  getRankedCandidates,
  candidatePreferences,
  finalizeInterview,
  shortlistApplication,
  assignSlots,
  downloadResume
};
