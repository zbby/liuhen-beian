/**
 * common/services/notify-service.js
 * 通知服务 — DING / 工作通知 / 静默时段合并
 * 
 * 铁律：仅事件发起时 DING 一次，其余走工作通知
 */

const dingtalk = require('../dingtalk-client');
const { nowISO } = require('../utils/helper');
const { NOTIFY_LEVEL, DING_WINDOW } = require('../utils/constants');

class NotifyService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 事件发起时发送 DING（仅此一次）
   * @param {string} orgId
   * @param {string} eventId
   * @param {string[]} userIds  DING 接收人（钉钉 userId 列表）
   * @param {string} content  DING 内容
   */
  async sendDingOnCreate(orgId, eventId, userIds, content) {
    if (!userIds || userIds.length === 0) return { ok: false, reason: 'no_recipients' };

    // 检查 DING 时间窗口
    const hour = new Date().getHours();
    if (hour < DING_WINDOW.start || hour >= DING_WINDOW.end) {
      // 窗口外 → 降级为工作通知
      return this.sendWorkNotice(orgId, eventId, userIds, content);
    }

    try {
      const result = await dingtalk.createDing(userIds, content);

      // 记录通知
      await this.dao.notification.insertOne({
        org_id: orgId,
        event_id: eventId,
        action: 'EVENT_CREATE',
        level: NOTIFY_LEVEL.DING,
        recipient_ids: userIds,
        status: 'SENT',
        ding_msg_id: result?.DingId || '',
        sent_at: nowISO(),
        delivered_at: nowISO(),
      });

      return { ok: true, level: NOTIFY_LEVEL.DING };
    } catch (err) {
      console.error('[notify] DING 发送失败，降级为工作通知:', err);

      // 降级
      return this.sendWorkNotice(orgId, eventId, userIds, content);
    }
  }

  /**
   * 发送工作通知
   */
  async sendWorkNotice(orgId, eventId, userIds, content) {
    if (!userIds || userIds.length === 0) return { ok: false, reason: 'no_recipients' };

    try {
      const result = await dingtalk.sendWorkNotice(null, userIds.join(','), {
        msgtype: 'text',
        text: { content },
      });

      await this.dao.notification.insertOne({
        org_id: orgId,
        event_id: eventId,
        action: 'WORK_NOTICE',
        level: NOTIFY_LEVEL.WORK_NOTICE,
        recipient_ids: userIds,
        status: 'SENT',
        sent_at: nowISO(),
        delivered_at: nowISO(),
      });

      return { ok: true, level: NOTIFY_LEVEL.WORK_NOTICE };
    } catch (err) {
      console.error('[notify] 工作通知发送失败:', err);

      await this.dao.notification.insertOne({
        org_id: orgId,
        event_id: eventId,
        action: 'WORK_NOTICE',
        level: NOTIFY_LEVEL.WORK_NOTICE,
        recipient_ids: userIds,
        status: 'FAILED',
        error_msg: err.message,
        sent_at: nowISO(),
      });

      return { ok: false, reason: err.message };
    }
  }

  /**
   * 获取通知偏好
   */
  async getPreferences(accountId, orgId) {
    const pref = await this.dao.notifyPreference.findByAccountAndOrg(accountId, orgId);
    return pref || {
      ding_window: DING_WINDOW,
      work_notice_window: { start: 0, end: 24 },
      daily_ding_limit: 5,
      daily_work_notice_limit: 50,
      weekend_quiet: true,
    };
  }

  /**
   * 更新通知偏好
   */
  async updatePreferences(accountId, orgId, updates) {
    const existing = await this.dao.notifyPreference.findByAccountAndOrg(accountId, orgId);

    if (existing) {
      await this.dao.notifyPreference.updateById(existing._id, updates);
    } else {
      await this.dao.notifyPreference.insertOne({
        account_id: accountId,
        org_id: orgId,
        ding_window: updates.ding_window || DING_WINDOW,
        work_notice_window: updates.work_notice_window || { start: 0, end: 24 },
        daily_ding_limit: updates.daily_ding_limit || 5,
        daily_work_notice_limit: updates.daily_work_notice_limit || 50,
        weekend_quiet: updates.weekend_quiet !== undefined ? updates.weekend_quiet : true,
      });
    }

    return { ok: true };
  }
}

module.exports = NotifyService;
