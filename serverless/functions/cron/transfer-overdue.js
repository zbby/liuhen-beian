/**
 * functions/cron/transfer-overdue.js
 * 扫描逾期转借，发送通知
 * 触发周期：每小时
 */

const createDao = require('../../common/dao');
const { nowISO } = require('../../common/utils/helper');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const now = nowISO();

  // 查找逾期未归还的转借事件
  const overdueTransfers = await dao.event.find({
    event_type: 'MATERIAL_TRANSFER',
    status: { $in: ['PROCESSING', 'PENDING_APPROVAL'] },
    'metadata.expected_return_date': { $lt: now },
    is_overdue: false,
  });

  let marked = 0;

  for (const evt of overdueTransfers) {
    try {
      await dao.event.updateById(evt._id, { is_overdue: true });
      // TODO: 发送逾期通知
      marked++;
    } catch (err) {
      console.error(`[cron] 逾期标记失败 event=${evt._id}:`, err);
    }
  }

  return { marked, total: overdueTransfers.length };
};
