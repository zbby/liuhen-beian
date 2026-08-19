/**
 * server/routes/audit.js
 * 审计路由 — 日志查询
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const dao = require('../dao-context');

router.use(authRequired);

// GET /api/audit/list
router.get('/list', asyncHandler(async (req, res) => {
  const orgId = req.query.org_id;
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.actor_id) filter.actor_id = req.query.actor_id;
  if (req.query.target_type) filter.target_type = req.query.target_type;

  return await dao.auditLog.findByOrgPaged(orgId, filter, {
    page: parseInt(req.query.page, 10) || 1,
    size: parseInt(req.query.size, 10) || 20,
    sort: { at: -1 },
  });
}));

module.exports = router;
