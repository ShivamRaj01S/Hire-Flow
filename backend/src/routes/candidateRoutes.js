const express = require("express");
const { ROLES } = require("../constants/roles");
const {
  analyzeResume,
  submitPreferredSlot,
  myInterviews,
  myApplication,
  myApplications,
  getOfferedSlots,
  selectOfferedSlot,
  listOpenJobProfiles,
  listRecruiters
} = require("../controllers/candidateController");
const { authenticate } = require("../middleware/authenticate");
const { authorize } = require("../middleware/authorize");
const { uploadResumeFile } = require("../middleware/resumeUpload");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate, authorize(ROLES.CANDIDATE));
router.post("/resume/analyze", uploadResumeFile, asyncHandler(analyzeResume));
router.post("/preferences", asyncHandler(submitPreferredSlot));
router.get("/application", asyncHandler(myApplication));
router.get("/applications", asyncHandler(myApplications));
router.get("/slots/offered", asyncHandler(getOfferedSlots));
router.post("/slots/select", asyncHandler(selectOfferedSlot));
router.get("/interviews", asyncHandler(myInterviews));
router.get("/job-profiles", asyncHandler(listOpenJobProfiles));
router.get("/recruiters", asyncHandler(listRecruiters));

module.exports = { candidateRoutes: router };
