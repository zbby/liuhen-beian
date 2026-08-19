/**
 * functions/auth/index.js
 * 认证云函数 — 免登/续签/注销
 */

const createDao = require('../../common/dao');
const createServices = require('../../common/services');
const { success, failFromError } = require('../../common/utils/errors');
const dingtalk = require('../../common/dingtalk-client');

// 凭证由钉钉云环境自动注入，无需硬编码
// 首次调用时延迟初始化（确保环境变量已就绪）
let _inited = false;
function ensureDingtalkInit() {
  if (_inited) return;
  dingtalk.init({
    appKey: process.env.DINGTALK_APP_KEY,
    appSecret: process.env.DINGTALK_APP_SECRET,
    agentId: process.env.DINGTALK_AGENT_ID,
  });
  _inited = true;
}

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
    ensureDingtalkInit();

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
