const sqlModels = require("../models/sql");

async function getInterviewCalendar(req, res) {
  const Interview = sqlModels.Interview;
  const interviews = await Interview.findAll({
    where: { recruiter_id: req.user.id, status: "SCHEDULED" },
    order: [["scheduled_time", "ASC"]]
  });
  return res.json(interviews);
}

module.exports = { getInterviewCalendar };
