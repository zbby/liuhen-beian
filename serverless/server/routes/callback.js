/**
 * server/routes/callback.js
 * 钉钉事件回调路由
 * 
 * 处理钉钉通讯录变更、事件订阅等回调
 */

const express = require('express');
const router = express.Router();
const dao = require('../dao-context');
const { nowISO } = require('../../common/utils/helper');

/**
 * 钉钉通讯录变更回调
 * POST /api/callback/dingtalk/contact
 */
router.post('/dingtalk/contact', async (req, res) => {
  const body = req.body || {};

  try {
    // 钉钉回调验证（首次配置回调URL时钉钉会发加密验证请求）
    if (body.encrypt) {
      return res.json({ success: true });
    }

    const eventType = body.EventType;
    console.log(`[callback] 通讯录变更: ${eventType}`);

    // 用户变更
    if (eventType === 'user_add_org' || eventType === 'user_modify_org' || eventType === 'user_leave_org') {
      const userId = body.UserId;
      if (userId) {
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
        console.log(`[callback] 部门变更: deptId=${deptId}, type=${eventType}`);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[callback] 通讯录回调处理失败:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 钉钉事件订阅通用回调
 * POST /api/callback/dingtalk/event
 */
router.post('/dingtalk/event', (req, res) => {
  const body = req.body || {};
  console.log(`[callback] 钉钉事件: ${body.EventType || 'unknown'}`);
  // 钉钉要求快速返回 200
  return res.json({ success: true });
});

module.exports = router;
