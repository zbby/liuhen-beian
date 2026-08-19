/**
 * server/dao-context.js
 * MongoDB DAO 上下文
 * 
 * 使用 Mongoose 连接 MongoDB，创建所有 DAO 实例
 * 所有路由文件通过 require('../dao-context') 获取 dao 实例
 */

const mongoose = require('mongoose');
const config = require('../config');

// ===== Mongoose Schema 定义 =====

// 通用 — 无严格 schema（允许动态字段，文档型数据库风格）
const anySchema = new mongoose.Schema({}, { strict: false, versionKey: false });

// 预定义集合
const collections = {
  org_accounts: 'OrgAccount',
  org_organizations: 'OrgOrganization',
  org_memberships: 'OrgMembership',
  org_departments: 'OrgDepartment',
  evt_events: 'Event',
  evt_attachments: 'Attachment',
  evt_process_actions: 'ProcessAction',
  evt_categories: 'Category',
  evt_event_type_configs: 'EventTypeConfig',
  apr_templates: 'ApprovalTemplate',
  apr_flows: 'ApprovalFlow',
  apr_steps: 'ApprovalStep',
  apr_delegations: 'Delegation',
  mat_inventory: 'Inventory',
  mat_stock_ledger: 'StockLedger',
  cls_rules: 'ClassifyRule',
  cls_feedback: 'ClassifyFeedback',
  ntf_notifications: 'Notification',
  ntf_preferences: 'NotifyPreference',
  ntf_templates: 'NotifyTemplate',
  aud_audit_logs: 'AuditLog',
  sys_configs: 'SysConfig',
  sys_sequences: 'Sequence',
};

// 为每个集合创建 Model
const models = {};
for (const [collection, modelName] of Object.entries(collections)) {
  models[modelName] = mongoose.model(modelName, anySchema, collection);
}

// ===== 适配 DAO 层 =====
// BaseDao 期望 db.collection(name) 接口，这里用 Mongoose Model 适配

class MongoAdapter {
  constructor(model) {
    this.model = model;
  }

  // 基本查询
  async findById(id) {
    try {
      return await this.model.findById(id).lean();
    } catch { return null; }
  }

  async findOne(query) {
    return await this.model.findOne(query).lean();
  }

  async find(query, options = {}) {
    let q = this.model.find(query);
    if (options.sort) q = q.sort(options.sort);
    if (options.skip) q = q.skip(options.skip);
    if (options.limit) q = q.limit(options.limit);
    if (options.projection) q = q.select(options.projection);
    return await q.lean();
  }

  async findPage(query, options = {}) {
    const { page = 1, size = 20, sort } = options;
    const skip = (page - 1) * size;

    const [data, total] = await Promise.all([
      this.find(query, { sort, skip, limit: size }),
      this.model.countDocuments(query),
    ]);

    return {
      list: data,
      total,
      page,
      size,
      total_pages: Math.ceil(total / size),
    };
  }

  async insertOne(doc) {
    const result = await this.model.create(doc);
    return result._id;
  }

  async insertMany(docs) {
    const results = await this.model.insertMany(docs);
    return results.map((r) => r._id);
  }

  async updateById(id, update) {
    const result = await this.model.findByIdAndUpdate(id, update, { new: true });
    return result ? 1 : 0;
  }

  async updateMany(query, update) {
    const result = await this.model.updateMany(query, update);
    return result.modifiedCount || 0;
  }

  async deleteById(id) {
    const result = await this.model.findByIdAndDelete(id);
    return result ? 1 : 0;
  }

  async deleteMany(query) {
    const result = await this.model.deleteMany(query);
    return result.deletedCount || 0;
  }

  async count(query) {
    return await this.model.countDocuments(query);
  }
}

// ===== 创建 DAO 实例 =====
// 复用 common/dao/ 中的类，注入 MongoAdapter

const AccountDao = require('../common/dao/account-dao');
const { OrgDao, MembershipDao, DepartmentDao } = require('../common/dao/org-dao');
const { EventDao, AttachmentDao, ProcessActionDao, CategoryDao, EventTypeConfigDao } = require('../common/dao/event-dao');
const { ApprovalTemplateDao, ApprovalFlowDao, ApprovalStepDao, DelegationDao } = require('../common/dao/approval-dao');
const { InventoryDao, StockLedgerDao } = require('../common/dao/material-dao');
const { SysConfigDao, SequenceDao, AuditLogDao, NotificationDao, NotifyPreferenceDao } = require('../common/dao/system-dao');

// 为每个 DAO 创建适配的 db 对象
function createAdapter(modelName) {
  return {
    collection: () => new MongoAdapter(models[modelName]),
  };
}

// BaseDao 构造函数期望 this.db.collection(name)
// 我们改造成直接传入 Mongoose Model
function makeDao(DaoClass, modelName) {
  const adapter = new MongoAdapter(models[modelName]);
  // BaseDao 使用 this.collection = db.collection(name)
  // 我们直接覆盖
  const dao = Object.create(DaoClass.prototype);
  dao.db = null;
  dao.collectionName = null;
  dao.collection = adapter;
  // 绑定所有方法
  Object.getOwnPropertyNames(MongoAdapter.prototype).forEach((method) => {
    if (method !== 'constructor') {
      dao[method] = adapter[method].bind(adapter);
    }
  });
  return dao;
}

// 特殊 DAO 需要 this.db.collection 模式，直接创建适配版本
const dao = {
  account: makeDao(AccountDao, 'OrgAccount'),
  org: makeDao(OrgDao, 'OrgOrganization'),
  membership: makeDao(MembershipDao, 'OrgMembership'),
  department: makeDao(DepartmentDao, 'OrgDepartment'),
  event: makeDao(EventDao, 'Event'),
  attachment: makeDao(AttachmentDao, 'Attachment'),
  processAction: makeDao(ProcessActionDao, 'ProcessAction'),
  category: makeDao(CategoryDao, 'Category'),
  eventTypeConfig: makeDao(EventTypeConfigDao, 'EventTypeConfig'),
  approvalTemplate: makeDao(ApprovalTemplateDao, 'ApprovalTemplate'),
  approvalFlow: makeDao(ApprovalFlowDao, 'ApprovalFlow'),
  approvalStep: makeDao(ApprovalStepDao, 'ApprovalStep'),
  delegation: makeDao(DelegationDao, 'Delegation'),
  inventory: makeDao(InventoryDao, 'Inventory'),
  stockLedger: makeDao(StockLedgerDao, 'StockLedger'),
  sysConfig: makeDao(SysConfigDao, 'SysConfig'),
  sequence: makeDao(SequenceDao, 'Sequence'),
  auditLog: makeDao(AuditLogDao, 'AuditLog'),
  notification: makeDao(NotificationDao, 'Notification'),
  notifyPreference: makeDao(NotifyPreferenceDao, 'NotifyPreference'),
};

module.exports = dao;
