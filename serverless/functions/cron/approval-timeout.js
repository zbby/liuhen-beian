/**
 * functions/cron/approval-timeout.js
 * 定时扫描超时审批节点，触发升级
 * 触发周期：每 10 分钟
 */

const createDao = require('../../common/dao');
const { APPROVAL_STEP_STATUS } = require('../../common/utils/constants');
const { nowISO } = require('../../common/utils/helper');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const now = nowISO();

  // 查找所有超时但未处理的步骤
  const overdueSteps = await dao.approvalStep.find({
    status: APPROVAL_STEP_STATUS.ACTIVE,
    timeout_at: { $lt: now },
    timeout_action: { $ne: null },
  });

  let processed = 0;

  for (const step of overdueSteps) {
    try {
      switch (step.timeout_action) {
        case 'AUTO_PASS':
          await dao.approvalStep.updateById(step._id, {
            status: APPROVAL_STEP_STATUS.APPROVED,
            finished_at: now,
          });
          break;
        case 'AUTO_REJECT':
          await dao.approvalStep.updateById(step._id, {
            status: APPROVAL_STEP_STATUS.REJECTED,
            finished_at: now,
          });
          break;
        case 'REMIND':
          // TODO: 发送提醒通知
          break;
        case 'ESCALATE':
          // TODO: 升级到上级
          break;
      }
      processed++;
    } catch (err) {
      console.error(`[cron] 审批超时处理失败 step=${step._id}:`, err);
    }
  }

  return { processed, total: overdueSteps.length, timestamp: now };
};
