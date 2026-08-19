/**
 * server/routes/event.js
 * 事件路由 — 提交/详情/列表/撤回/处理
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const { EventService } = require('../../common/services/event-service');
const { ApprovalService } = require('../../common/services/approval-service');
const { NotifyService } = require('../../common/services/notify-service');
const dao = require('../dao-context');

const eventService = new EventService(dao);
const approvalService = new ApprovalService(dao);
const notifyService = new NotifyService(dao);

router.use(authRequired);

// GET /api/event/type-list — 事件类型列表
router.get('/type-list', asyncHandler(async (req, res) => {
  return require('../../common/utils/constants').EVENT_TYPES;
}));

// POST /api/event/submit — 提交事件
router.post('/submit', asyncHandler(async (req, res) => {
  const orgId = req.body.org_id || req.currentUser.org_id;
  const result = await eventService.submit(req.currentUser.account_id, orgId, req.body);

  // 触发审批流
  if (req.body.approval_template_id && result.event_id) {
    await approvalService.createFlow(orgId, result.event_id, req.body.approval_template_id, req.currentUser.account_id);
  }

  // 发起事件时发送 DING（仅此一次）
  if (req.body.must_notify_user_ids && req.body.must_notify_user_ids.length > 0) {
    await notifyService.sendDingOnCreate(orgId, result.event_id, req.body.must_notify_user_ids, `【留痕备案】${req.body.title}`);
  }

  return result;
}));

// GET /api/event/list — 事件列表
router.get('/list', asyncHandler(async (req, res) => {
  const orgId = req.query.org_id || req.currentUser.org_id;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.event_type) filter.event_type = req.query.event_type;
  return await eventService.listByOrg(orgId, filter, req.query);
}));

// GET /api/event/detail — 事件详情
router.get('/detail', asyncHandler(async (req, res) => {
  return await eventService.getDetail(req.query.event_id, req.currentUser.account_id);
}));

// POST /api/event/cancel — 撤回事件
router.post('/cancel', asyncHandler(async (req, res) => {
  return await eventService.withdraw(req.currentUser.account_id, req.body.event_id);
}));

// POST /api/event/process — 处理动作
router.post('/process', asyncHandler(async (req, res) => {
  return await eventService.processAction(
    req.currentUser.account_id,
    req.body.event_id,
    req.body.action_type,
    req.body.payload
  );
}));

module.exports = router;
