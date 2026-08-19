/**
 * common/dao/index.js
 * DAO 层统一导出 + 统一初始化
 * 
 * 用法：
 *   const dao = require('../common/dao')(db);
 *   dao.account.findByUnionId('xxx');
 */

const AccountDao = require('./account-dao');
const { OrgDao, MembershipDao, DepartmentDao } = require('./org-dao');
const {
  EventDao,
  AttachmentDao,
  ProcessActionDao,
  CategoryDao,
  EventTypeConfigDao,
} = require('./event-dao');
const {
  ApprovalTemplateDao,
  ApprovalFlowDao,
  ApprovalStepDao,
  DelegationDao,
} = require('./approval-dao');
const { InventoryDao, StockLedgerDao } = require('./material-dao');
const {
  SysConfigDao,
  SequenceDao,
  AuditLogDao,
  NotificationDao,
  NotifyPreferenceDao,
} = require('./system-dao');

module.exports = function createDaoContext(db) {
  return {
    account: new AccountDao(db),
    org: new OrgDao(db),
    membership: new MembershipDao(db),
    department: new DepartmentDao(db),
    event: new EventDao(db),
    attachment: new AttachmentDao(db),
    processAction: new ProcessActionDao(db),
    category: new CategoryDao(db),
    eventTypeConfig: new EventTypeConfigDao(db),
    approvalTemplate: new ApprovalTemplateDao(db),
    approvalFlow: new ApprovalFlowDao(db),
    approvalStep: new ApprovalStepDao(db),
    delegation: new DelegationDao(db),
    inventory: new InventoryDao(db),
    stockLedger: new StockLedgerDao(db),
    sysConfig: new SysConfigDao(db),
    sequence: new SequenceDao(db),
    auditLog: new AuditLogDao(db),
    notification: new NotificationDao(db),
    notifyPreference: new NotifyPreferenceDao(db),
  };
};
