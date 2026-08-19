/**
 * server/routes/org.js
 * 组织路由 — 创建/加入/成员/退出
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const OrgService = require('../../common/services/org-service');
const dao = require('../dao-context');

const orgService = new OrgService(dao);

router.use(authRequired);

// GET /api/org/list — 我的组织列表
router.get('/list', asyncHandler(async (req, res) => {
  return await orgService.listMyOrgs(req.currentUser.account_id);
}));

// POST /api/org/create — 创建组织
router.post('/create', asyncHandler(async (req, res) => {
  return await orgService.create(req.currentUser.account_id, req.body);
}));

// POST /api/org/join-by-invite — 邀请码加入
router.post('/join-by-invite', asyncHandler(async (req, res) => {
  return await orgService.joinByInvite(req.currentUser.account_id, req.body.inviteCode);
}));

// GET /api/org/members — 组织成员列表
router.get('/members', asyncHandler(async (req, res) => {
  return await orgService.listMembers(req.query.org_id, {
    page: parseInt(req.query.page, 10) || 1,
    size: parseInt(req.query.size, 10) || 20,
  });
}));

// POST /api/org/leave — 退出组织
router.post('/leave', asyncHandler(async (req, res) => {
  return await orgService.leave(req.currentUser.account_id, req.body.org_id);
}));

module.exports = router;
