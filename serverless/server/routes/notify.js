/**
 * server/routes/notify.js
 * 通知路由 — 偏好管理
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const { NotifyService } = require('../../common/services/notify-service');
const dao = require('../dao-context');

const notifyService = new NotifyService(dao);

router.use(authRequired);

// GET /api/notify/preferences
router.get('/preferences', asyncHandler(async (req, res) => {
  return await notifyService.getPreferences(
    req.currentUser.account_id,
    req.query.org_id || req.currentUser.org_id
  );
}));

// PUT /api/notify/preferences
router.put('/preferences', asyncHandler(async (req, res) => {
  return await notifyService.updatePreferences(
    req.currentUser.account_id,
    req.body.org_id || req.currentUser.org_id,
    req.body
  );
}));

module.exports = router;
