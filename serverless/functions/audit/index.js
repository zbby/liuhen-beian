/**
 * functions/audit/index.js
 * 审计云函数 — 日志查询
 */

const createDao = require('../../common/dao');
const createServices = require('../../common/services');
const { success, failFromError } = require('../../common/utils/errors');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const path = event.path || '';
  const method = (event.method || event.httpMethod || 'GET').toUpperCase();
  const query = event.queryParameters || {};

  try {
    // GET /audit/list — 审计日志查询
    if (path === '/audit/list' && method === 'GET') {
      const orgId = query.org_id;
      const filter = {};
      if (query.category) filter.category = query.category;
      if (query.actor_id) filter.actor_id = query.actor_id;
      if (query.target_type) filter.target_type = query.target_type;

      const result = await dao.auditLog.findByOrgPaged(orgId, filter, {
        page: parseInt(query.page, 10) || 1,
        size: parseInt(query.size, 10) || 20,
        sort: { at: -1 },
      });
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
