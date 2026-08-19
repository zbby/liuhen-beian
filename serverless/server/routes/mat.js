/**
 * server/routes/mat.js
 * 甲供材路由 — 仪表盘/库存/入库/出库/转借/退库
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const MaterialService = require('../../common/services/material-service');
const dao = require('../dao-context');

const materialService = new MaterialService(dao);

router.use(authRequired);

// GET /api/mat/inventory — 库存查询
router.get('/inventory', asyncHandler(async (req, res) => {
  return await materialService.listInventory(req.query, {
    page: parseInt(req.query.page, 10) || 1,
    size: parseInt(req.query.size, 10) || 20,
  });
}));

// POST /api/mat/stock-in — 入库
router.post('/stock-in', asyncHandler(async (req, res) => {
  const orgId = req.body.org_id || req.currentUser.org_id;
  return await materialService.stockIn(req.currentUser.account_id, orgId, req.body);
}));

// POST /api/mat/stock-out — 出库
router.post('/stock-out', asyncHandler(async (req, res) => {
  const orgId = req.body.org_id || req.currentUser.org_id;
  return await materialService.stockOut(req.currentUser.account_id, orgId, req.body);
}));

// POST /api/mat/transfer — 转借
router.post('/transfer', asyncHandler(async (req, res) => {
  const orgId = req.body.org_id || req.currentUser.org_id;
  return await materialService.transfer(req.currentUser.account_id, orgId, req.body);
}));

// POST /api/mat/return — 退库
router.post('/return', asyncHandler(async (req, res) => {
  const orgId = req.body.org_id || req.currentUser.org_id;
  return await materialService.returnMaterial(req.currentUser.account_id, orgId, req.body);
}));

// GET /api/mat/report — 甲供材报表
router.get('/report', asyncHandler(async (req, res) => {
  const orgId = req.query.org_id || req.currentUser.org_id;
  return await materialService.getDashboard(orgId);
}));

module.exports = router;
