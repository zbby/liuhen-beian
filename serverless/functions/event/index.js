/**
 * functions/event/index.js
 * 事件云函数 — 提交/详情/列表/撤回/处理动作
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

    // GET /event/type-list — 事件类型列表
    if (path === '/event/type-list' && method === 'GET') {
      const types = require('../../common/utils/constants').EVENT_TYPES;
      return success(types);
    }

    // POST /event/submit — 提交事件
    if (path === '/event/submit' && method === 'POST') {
      const result = await services.event.submit(
        currentUser.account_id,
        body.org_id || currentUser.org_id,
        body
      );

      // 如果指定了审批模板，触发审批流
      if (body.approval_template_id && result.event_id) {
        await services.approval.createFlow(
          body.org_id || currentUser.org_id,
          result.event_id,
          body.approval_template_id,
          currentUser.account_id
        );
      }

      // 发起事件时发送 DING
      if (body.must_notify_user_ids && body.must_notify_user_ids.length > 0) {
        await services.notify.sendDingOnCreate(
          body.org_id || currentUser.org_id,
          result.event_id,
          body.must_notify_user_ids,
          `【留痕报备】${body.title}`
        );
      }

      return success(result);
    }

    // GET /event/list — 事件列表
    if (path === '/event/list' && method === 'GET') {
      const orgId = query.org_id || currentUser.org_id;
      const filter = {};
      if (query.status) filter.status = query.status;
      if (query.event_type) filter.event_type = query.event_type;
      const result = await services.event.listByOrg(orgId, filter, query);
      return success(result);
    }

    // GET /event/detail — 事件详情
    if (path === '/event/detail' && method === 'GET') {
      const result = await services.event.getDetail(query.event_id, currentUser.account_id);
      return success(result);
    }

    // POST /event/cancel — 撤回事件
    if (path === '/event/cancel' && method === 'POST') {
      const result = await services.event.withdraw(currentUser.account_id, body.event_id);
      return success(result);
    }

    // POST /event/process — 处理动作
    if (path === '/event/process' && method === 'POST') {
      const result = await services.event.processAction(
        currentUser.account_id,
        body.event_id,
        body.action_type,
        body.payload
      );
      return success(result);
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
