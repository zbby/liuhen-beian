/**
 * functions/org/index.js
 * 组织云函数 — 创建/加入/成员/邀请码
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

    // GET /org/list — 我的组织列表
    if (path === '/org/list' && method === 'GET') {
      const result = await services.org.listMyOrgs(currentUser.account_id);
      return success(result);
    }

    // GET /org/search — 搜索组织
    if (path === '/org/search' && method === 'GET') {
      const result = await services.org.searchOrgs(query.keyword || '');
      return success(result);
    }

    // POST /org/create — 创建组织
    if (path === '/org/create' && method === 'POST') {
      const result = await services.org.create(currentUser.account_id, body);
      return success(result);
    }

    // POST /org/join — 按组织ID加入
    if (path === '/org/join' && method === 'POST') {
      const result = await services.org.joinById(currentUser.account_id, body.org_id);
      return success(result);
    }

    // POST /org/join-by-invite — 邀请码加入（兼容旧版）
    if (path === '/org/join-by-invite' && method === 'POST') {
      const result = await services.org.joinByInvite(currentUser.account_id, body.inviteCode);
      return success(result);
    }

    // GET /org/members — 组织成员
    if (path === '/org/members' && method === 'GET') {
      const orgId = query.org_id;
      const result = await services.org.listMembers(orgId, {
        page: parseInt(query.page, 10) || 1,
        size: parseInt(query.size, 10) || 20,
      });
      return success(result);
    }

    // POST /org/leave — 退出组织
    if (path === '/org/leave' && method === 'POST') {
      const result = await services.org.leave(currentUser.account_id, body.org_id);
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
