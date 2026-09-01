const express = require("express");
const { ROLES } = require("../constants/roles");
const { authenticate } = require("../middleware/authenticate");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  createJobProfile,
  getRankedCandidates,
  candidatePreferences,
  finalizeInterview,
  shortlistApplication,
  assignSlots,
  downloadResume
} = require("../controllers/recruiterController");

const router = express.Router();

router.use(authenticate, authorize(ROLES.RECRUITER));
router.post("/job-profiles", asyncHandler(createJobProfile));
router.get("/candidates/ranking", asyncHandler(getRankedCandidates));
router.get("/candidate-preferences", asyncHandler(candidatePreferences));
router.post("/interviews/finalize", asyncHandler(finalizeInterview));
router.post("/applications/:applicationId/shortlist", asyncHandler(shortlistApplication));
router.post("/applications/:applicationId/slots", asyncHandler(assignSlots));
router.get("/resumes/:resumeId/download", asyncHandler(downloadResume));

module.exports = { recruiterRoutes: router };
