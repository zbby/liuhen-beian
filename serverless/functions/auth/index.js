/**
 * functions/auth/index.js
 * 认证云函数 — 免登/续签/注销
 */

const createDao = require('../../common/dao');
const createServices = require('../../common/services');
const { success, failFromError } = require('../../common/utils/errors');
const dingtalk = require('../../common/dingtalk-client');

// 初始化钉钉凭证
dingtalk.init({
  appKey: process.env.DINGTALK_APP_KEY || 'dingb4uqplxslldd9uaa',
  appSecret: process.env.DINGTALK_APP_SECRET || 'TtF1E2GCZIGkSjs8B_91q1Jm0rklNyotb_3MUS7pkrnfw6q6UVIxKxUFYCAjtRh3',
  agentId: process.env.DINGTALK_AGENT_ID || '4598010509',
});

/**
 * 云函数入口
 * @param {object} event  { path, method, queryParameters, body, headers }
 */
exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);
  const services = createServices(dao);

  const path = event.path || '';
  const method = (event.method || event.httpMethod || 'GET').toUpperCase();

  try {
    // POST /auth/login
    if (path === '/auth/login' && method === 'POST') {
      const { authCode } = event.body || {};
      const result = await services.auth.login(authCode);
      return success(result);
    }

    // POST /auth/refresh
    if (path === '/auth/refresh' && method === 'POST') {
      const { token } = event.body || {};
      const result = await services.auth.refresh(token);
      return success(result);
    }

    // POST /auth/logout
    if (path === '/auth/logout' && method === 'POST') {
      const currentUser = services.auth.getCurrentUser(event);
      const result = await services.auth.logout(currentUser.account_id);
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
