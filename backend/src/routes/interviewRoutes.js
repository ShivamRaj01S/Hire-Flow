const express = require("express");
const { ROLES } = require("../constants/roles");
const { authenticate } = require("../middleware/authenticate");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const { getInterviewCalendar } = require("../controllers/interviewController");

const router = express.Router();

router.use(authenticate, authorize(ROLES.RECRUITER));
router.get("/calendar", asyncHandler(getInterviewCalendar));

module.exports = { interviewRoutes: router };
