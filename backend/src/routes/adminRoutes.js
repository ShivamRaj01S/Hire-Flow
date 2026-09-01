const express = require("express");
const { ROLES } = require("../constants/roles");
const { authenticate } = require("../middleware/authenticate");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const { getAuditLogs, deleteUser, listUsers } = require("../controllers/adminController");

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMINISTRATOR));
router.get("/audit-logs", asyncHandler(getAuditLogs));
router.get("/users", asyncHandler(listUsers));
router.delete("/users/:userId", asyncHandler(deleteUser));

module.exports = { adminRoutes: router };
