/**
 * utils/constants.js
 * 全局常量定义
 */

// 事件状态枚举
const EVENT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  WITHDRAWN: 'withdrawn'
};

// 事件状态文字映射
const EVENT_STATUS_TEXT = {
  draft: '草稿',
  pending_approval: '待审批',
  processing: '办理中',
  completed: '已完结',
  rejected: '已驳回',
  archived: '已归档',
  withdrawn: '已撤回'
};

// 审批模式
const APPROVAL_MODE = {
  COUNTERSIGN: 'countersign',  // 会签：所有人都需同意
  OR_SIGN: 'orSign',           // 或签：一人同意即可
  NOTIFY_ONLY: 'notifyOnly'    // 仅知会：不审批只通知
};

// 审批模式文字
const APPROVAL_MODE_TEXT = {
  countersign: '会签',
  orSign: '或签',
  notifyOnly: '仅知会'
};

// 审批节点类型
const NODE_TYPE = {
  APPROVAL: 'approval',
  CC: 'cc',
  WITNESS: 'witness',
  ACTION: 'action'
};

// 指派规则
const ASSIGN_RULE = {
  MANUAL: 'manual',
  PRESET: 'preset',
  AUTO: 'auto',
  RULE: 'rule'
};

// 审批意见
const APPROVAL_ACTION = {
  AGREE: 'agree',
  REJECT: 'reject',
  TRANSFER: 'transfer',   // 转办
  COUNTERSIGN_ADD: 'add'  // 加签
};

// 权限角色
const ROLE = {
  ORG_ADMIN: 'org_admin',      // 组织管理员
  ORG_MEMBER: 'org_member',    // 普通成员
  DEPT_HEAD: 'dept_head',      // 部门负责人
  SECURITY_ADMIN: 'security_admin', // 安全管理员
  AUDITOR: 'auditor'           // 审计员
};

// 附件类型
const ATTACHMENT_TYPE = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file'
};

// 甲供材单据类型
const MATERIAL_DOC_TYPE = {
  IN: 'material_in',        // 入库
  OUT: 'material_out',      // 出库
  BORROW: 'material_borrow', // 转借
  RETURN: 'material_return', // 归还
  SCRAP: 'material_scrap',   // 报废
  TRANSFER: 'material_transfer' // 调拨
};

// 甲供材状态
const MATERIAL_STATUS = {
  IN_STOCK: 'in_stock',       // 在库
  OUT: 'out',                  // 已出库
  BORROWED: 'borrowed',        // 已借出
  TRANSFERRED: 'transferred',  // 已调拨
  SCRAPPED: 'scrapped',        // 已报废
  LOST: 'lost',                // 盘亏
  RETURNED: 'returned'         // 已归还
};

module.exports = {
  EVENT_STATUS,
  EVENT_STATUS_TEXT,
  APPROVAL_MODE,
  APPROVAL_MODE_TEXT,
  NODE_TYPE,
  ASSIGN_RULE,
  APPROVAL_ACTION,
  ROLE,
  ATTACHMENT_TYPE,
  MATERIAL_DOC_TYPE,
  MATERIAL_STATUS
};
