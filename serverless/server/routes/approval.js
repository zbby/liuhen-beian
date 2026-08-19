/**
 * server/routes/approval.js
 * 审批路由 — 模板/待办/审批动作/加签
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const ApprovalService = require('../../common/services/approval-service');
const dao = require('../dao-context');

const approvalService = new ApprovalService(dao);

router.use(authRequired);

// GET /api/approval/templates — 审批模板列表
router.get('/templates', asyncHandler(async (req, res) => {
  const orgId = req.query.org_id || req.currentUser.org_id;
  return await approvalService.getTemplates(orgId, req.query.event_type);
}));

// GET /api/approval/pending — 我的待办
router.get('/pending', asyncHandler(async (req, res) => {
  return await approvalService.getPendingByUser(req.currentUser.account_id, {
    page: parseInt(req.query.page, 10) || 1,
    size: parseInt(req.query.size, 10) || 20,
  });
}));

// POST /api/approval/act — 审批动作
router.post('/act', asyncHandler(async (req, res) => {
  return await approvalService.act(
    req.currentUser.account_id,
    req.body.flow_id,
    req.body.action,
    req.body.comment,
    req.body.extra || {}
  );
}));

// POST /api/approval/add-signer — 加签
router.post('/add-signer', asyncHandler(async (req, res) => {
  return await approvalService.addCounterSigner(
    req.currentUser.account_id,
    req.body.flow_id,
    req.body.user_ids
  );
}));

module.exports = router;
