/**
 * functions/notify/index.js
 * 通知云函数 — 偏好管理
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

    // GET /notify/preferences — 获取通知偏好
    if (path === '/notify/preferences' && method === 'GET') {
      const result = await services.notify.getPreferences(
        currentUser.account_id,
        query.org_id || currentUser.org_id
      );
      return success(result);
    }

    // PUT /notify/preferences — 更新通知偏好
    if (path === '/notify/preferences' && method === 'PUT') {
      const result = await services.notify.updatePreferences(
        currentUser.account_id,
        body.org_id || currentUser.org_id,
        body
      );
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
