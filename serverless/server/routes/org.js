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

// GET /api/org/search — 搜索组织
router.get('/search', asyncHandler(async (req, res) => {
  return await orgService.searchOrgs(req.query.keyword || '');
}));

// POST /api/org/create — 创建组织
router.post('/create', asyncHandler(async (req, res) => {
  return await orgService.create(req.currentUser.account_id, req.body);
}));

// POST /api/org/join — 按组织ID加入
router.post('/join', asyncHandler(async (req, res) => {
  return await orgService.joinById(req.currentUser.account_id, req.body.org_id);
}));

// POST /api/org/join-by-invite — 邀请码加入（兼容旧版）
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

// POST /api/org/gen-invite-code — 生成邀请码（复用 org_code）
router.post('/gen-invite-code', asyncHandler(async (req, res) => {
  const orgs = await orgService.listMyOrgs(req.currentUser.account_id);
  if (!orgs || orgs.length === 0) {
    const { BizError, ERROR_CODES } = require('../../common/utils/errors');
    throw new BizError(ERROR_CODES.ORG_NOT_FOUND, '您尚未加入任何组织');
  }
  // 返回第一个组织的 org_code 作为邀请码
  return { code: orgs[0].org_code, expireDays: 7 };
}));

module.exports = router;
