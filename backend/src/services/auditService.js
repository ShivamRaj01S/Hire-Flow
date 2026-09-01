const sqlModels = require("../models/sql");

async function writeAuditLog({ userIdentity, actionPerformed }) {
  const AuditLog = sqlModels.AuditLog;
  if (!AuditLog) return;
  await AuditLog.create({
    user_identity: userIdentity,
    action_performed: actionPerformed,
    timestamp: new Date()
  });
}

module.exports = { writeAuditLog };
