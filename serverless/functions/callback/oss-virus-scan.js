/**
 * functions/callback/oss-virus-scan.js
 * 病毒扫描完成回调
 */

const createDao = require('../../common/dao');
const { nowISO } = require('../../common/utils/helper');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const body = event.body || {};

  try {
    const { oss_key, scan_result } = body;

    if (!oss_key) {
      return { success: false, error: 'oss_key missing' };
    }

    // 更新附件的病毒扫描状态
    const attachment = await dao.attachment.findOne({ oss_key });
    if (attachment) {
      await dao.attachment.updateById(attachment._id, {
        virus_scan_status: scan_result === 'CLEAN' ? 'CLEAN' : 'INFECTED',
      });

      // 如果发现病毒，记录审计日志
      if (scan_result !== 'CLEAN') {
        await dao.auditLog.append({
          category: 'SECURITY',
          action: 'VIRUS_DETECTED',
          target_type: 'attachment',
          target_id: attachment._id,
          detail: { oss_key, scan_result },
        });
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[callback] 病毒扫描回调处理失败:', err);
    return { success: false, error: err.message };
  }
};
