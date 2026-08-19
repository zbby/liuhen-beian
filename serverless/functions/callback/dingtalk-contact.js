/**
 * functions/callback/dingtalk-contact.js
 * 钉钉通讯录变更回调
 */

const createDao = require('../../common/dao');
const { nowISO } = require('../../common/utils/helper');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const body = event.body || {};

  try {
    // 钉钉回调验证
    if (body.encrypt) {
      // 首次验证回调 URL
      return { success: true };
    }

    // 处理通讯录变更事件
    const eventType = body.EventType;
    console.log(`[callback] 通讯录变更: ${eventType}`);

    // 用户变更
    if (eventType === 'user_add_org' || eventType === 'user_modify_org' || eventType === 'user_leave_org') {
      const userId = body.UserId;
      if (userId) {
        // 同步到平台账号
        await dao.account.upsertByUnionId(body.UnionId || userId, {
          ding_user_id: userId,
          status: eventType === 'user_leave_org' ? 'LEFT' : 'ACTIVE',
          updated_at: nowISO(),
        });
      }
    }

    // 部门变更
    if (eventType === 'org_dept_create' || eventType === 'org_dept_modify' || eventType === 'org_dept_remove') {
      const deptId = body.DeptId;
      if (deptId) {
        await dao.department.updateById(deptId, {
          // 同步部门信息
          updated_at: nowISO(),
        });
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[callback] 通讯录回调处理失败:', err);
    return { success: false, error: err.message };
  }
};
