/**
 * server/routes/classify.js
 * 分类路由 — 预测分类
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const EventService = require('../../common/services/event-service');
const dao = require('../dao-context');

const eventService = new EventService(dao);

// POST /api/classify/predict
router.post('/predict', asyncHandler(async (req, res) => {
  return await eventService._predictCategory(
    req.body.title || '',
    req.body.description || '',
    req.body.event_type || ''
  );
}));

module.exports = router;
