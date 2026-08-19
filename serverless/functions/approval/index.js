/**
 * functions/approval/index.js
 * 审批云函数 — 模板/待办/审批动作/加签
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

    // GET /approval/templates — 审批模板列表
    if (path === '/approval/templates' && method === 'GET') {
      const orgId = query.org_id || currentUser.org_id;
      const result = await services.approval.getTemplates(orgId, query.event_type);
      return success(result);
    }

    // GET /approval/pending — 我的待办
    if (path === '/approval/pending' && method === 'GET') {
      const result = await services.approval.getPendingByUser(currentUser.account_id, {
        page: parseInt(query.page, 10) || 1,
        size: parseInt(query.size, 10) || 20,
      });
      return success(result);
    }

    // POST /approval/act — 审批动作
    if (path === '/approval/act' && method === 'POST') {
      const result = await services.approval.act(
        currentUser.account_id,
        body.flow_id,
        body.action,
        body.comment,
        body.extra || {}
      );
      return success(result);
    }

    // POST /approval/add-signer — 加签
    if (path === '/approval/add-signer' && method === 'POST') {
      const result = await services.approval.addCounterSigner(
        currentUser.account_id,
        body.flow_id,
        body.user_ids
      );
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
