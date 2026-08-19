/**
 * functions/classify/index.js
 * 分类云函数 — 预测分类
 */

const createDao = require('../../common/dao');
const createServices = require('../../common/services');
const { success, failFromError } = require('../../common/utils/errors');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);
  const services = createServices(dao);

  const path = event.path || '';
  const method = (event.method || event.httpMethod || 'GET').toUpperCase();
  const body = event.body || {};

  try {
    // POST /classify/predict
    if (path === '/classify/predict' && method === 'POST') {
      const prediction = await services.event._predictCategory(
        body.title || '',
        body.description || '',
        body.event_type || ''
      );
      return success(prediction);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
