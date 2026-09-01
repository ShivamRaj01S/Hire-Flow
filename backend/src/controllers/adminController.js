const sqlModels = require("../models/sql");
const { Op } = require("sequelize");
const { ResumeData } = require("../models/mongo/ResumeData");
const { ApiError } = require("../errors/ApiError");
const { writeAuditLog } = require("../services/auditService");

async function getAuditLogs(req, res) {
  const AuditLog = sqlModels.AuditLog;
  const { user, action, from, to } = req.query;
  const where = {};

  if (user) {
    where.user_identity = { [Op.like]: `%${String(user).trim()}%` };
  }
  if (action) {
    where.action_performed = { [Op.like]: `%${String(action).trim()}%` };
  }
  if (from || to) {
    where.timestamp = {};
    if (from) {
      const fromDate = new Date(String(from));
      if (!Number.isNaN(fromDate.getTime())) where.timestamp[Op.gte] = fromDate;
    }
    if (to) {
      const toDate = new Date(String(to));
      if (!Number.isNaN(toDate.getTime())) where.timestamp[Op.lte] = toDate;
    }
    if (Object.keys(where.timestamp).length === 0) delete where.timestamp;
  }

  const logs = await AuditLog.findAll({
    where,
    order: [["timestamp", "DESC"]],
    limit: 500
  });
  return res.json(logs);
}

async function deleteUser(req, res) {
  const User = sqlModels.User;
  const Interview = sqlModels.Interview;
  const Application = sqlModels.Application;
  const SlotOffer = sqlModels.SlotOffer;
  const JobProfile = sqlModels.JobProfile;
  const { userId } = req.params;
  const id = Number(userId);
  if (!id) throw new ApiError(400, "Valid userId is required.");
  if (id === req.user.id) throw new ApiError(400, "Admin cannot delete own account.");

  const user = await User.findByPk(id);
  if (!user) throw new ApiError(404, "User not found.");

  const applications = await Application.findAll({ where: { [Op.or]: [{ candidate_id: id }, { recruiter_id: id }] } });
  const applicationIds = applications.map((a) => a.id);
  if (applicationIds.length > 0) {
    await SlotOffer.destroy({ where: { application_id: { [Op.in]: applicationIds } } });
    await Application.destroy({ where: { id: { [Op.in]: applicationIds } } });
  }
  await Interview.destroy({ where: { [Op.or]: [{ candidate_id: id }, { recruiter_id: id }] } });
  await JobProfile.destroy({ where: { recruiter_id: id } });
  await ResumeData.deleteMany({ mysql_user_id: id });
  await User.destroy({ where: { id } });

  await writeAuditLog({
    userIdentity: req.user.email,
    actionPerformed: `DELETED_USER:${id}:${user.email}`
  });
  return res.json({ success: true, deletedUserId: id });
}

async function listUsers(req, res) {
  const User = sqlModels.User;
  const rows = await User.findAll({
    attributes: ["id", "email", "role", "created_at"],
    order: [["id", "DESC"]]
  });
  return res.json(rows);
}

module.exports = { getAuditLogs, deleteUser, listUsers };
