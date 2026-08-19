/**
 * functions/cron/event-auto-archive.js
 * 完结事件 N 天后自动归档
 * 触发周期：每天 02:00
 */

const createDao = require('../../common/dao');
const { EVENT_STATUS, ARCHIVE_AUTO_DAYS } = require('../../common/utils/constants');
const { nowISO } = require('../../common/utils/helper');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const archiveAfterDays = ARCHIVE_AUTO_DAYS; // 默认 7 天
  const cutoffDate = new Date(Date.now() - archiveAfterDays * 86400000).toISOString();

  // 查找已完成但未归档的事件
  const completedEvents = await dao.event.find({
    status: EVENT_STATUS.COMPLETED,
    completed_at: { $lt: cutoffDate },
    archived_at: null,
  });

  let archived = 0;

  for (const evt of completedEvents) {
    try {
      await dao.event.updateById(evt._id, {
        status: EVENT_STATUS.ARCHIVED,
        archived_at: nowISO(),
        status_history: [...(evt.status_history || []), {
          from: EVENT_STATUS.COMPLETED,
          to: EVENT_STATUS.ARCHIVED,
          actor_id: null,
          action: 'AUTO_ARCHIVE',
          at: nowISO(),
        }],
      });
      archived++;
    } catch (err) {
      console.error(`[cron] 自动归档失败 event=${evt._id}:`, err);
    }
  }

  return { archived, total: completedEvents.length, cutoff: cutoffDate };
};
