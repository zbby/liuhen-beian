/**
 * functions/mat/index.js
 * 甲供材云函数 — 仪表盘/库存/入库/出库/转借/退库/报表
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
  const query = event.queryParameters || {};
  const body = event.body || {};

  try {
    const currentUser = services.auth.getCurrentUser(event);
    const orgId = body.org_id || query.org_id || currentUser.org_id;

    // GET /mat/inventory — 库存查询
    if (path === '/mat/inventory' && method === 'GET') {
      const result = await services.material.listInventory(query, {
        page: parseInt(query.page, 10) || 1,
        size: parseInt(query.size, 10) || 20,
      });
      return success(result);
    }

    // POST /mat/stock-in — 入库
    if (path === '/mat/stock-in' && method === 'POST') {
      const result = await services.material.stockIn(currentUser.account_id, orgId, body);
      return success(result);
    }

    // POST /mat/stock-out — 出库
    if (path === '/mat/stock-out' && method === 'POST') {
      const result = await services.material.stockOut(currentUser.account_id, orgId, body);
      return success(result);
    }

    // POST /mat/transfer — 转借
    if (path === '/mat/transfer' && method === 'POST') {
      const result = await services.material.transfer(currentUser.account_id, orgId, body);
      return success(result);
    }

    // POST /mat/return — 退库
    if (path === '/mat/return' && method === 'POST') {
      const result = await services.material.returnMaterial(currentUser.account_id, orgId, body);
      return success(result);
    }

    // GET /mat/report — 甲供材报表
    if (path === '/mat/report' && method === 'GET') {
      const result = await services.material.getDashboard(orgId);
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
