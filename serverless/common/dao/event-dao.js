/**
 * common/dao/event-dao.js
 * 事件数据访问
 */

const BaseDao = require('./base-dao');

class EventDao extends BaseDao {
  constructor(db) {
    super(db, 'evt_events');
  }

  /**
   * 按组织+状态分页查询
   */
  async findByOrgPaged(orgId, query = {}, options = {}) {
    const filter = { org_id: orgId, is_deleted: { $ne: true }, ...query };
    return this.findPage(filter, options);
  }

  /**
   * 按发起人查询
   */
  async findByInitiator(accountId, query = {}, options = {}) {
    const filter = { initiator_id: accountId, is_deleted: { $ne: true }, ...query };
    return this.findPage(filter, options);
  }

  /**
   * 按参与人查询（含审批人）
   */
  async findByInvolvedUser(accountId, query = {}, options = {}) {
    const filter = { involved_users: accountId, is_deleted: { $ne: true }, ...query };
    return this.findPage(filter, options);
  }

  /**
   * 更新事件状态
   */
  async updateStatus(eventId, fromStatus, toStatus, statusHistoryEntry) {
    const update = {
      status: toStatus,
      status_history: dbCmd().push(statusHistoryEntry),
      updated_at: new Date().toISOString(),
    };
    // 时间戳字段
    if (toStatus === 'PENDING_APPROVAL') update.submitted_at = new Date().toISOString();
    if (toStatus === 'COMPLETED') update.completed_at = new Date().toISOString();
    if (toStatus === 'ARCHIVED') update.archived_at = new Date().toISOString();

    return this.collection.doc(eventId).update(update);
  }
}

// 获取 dbCmd 引用（懒加载）
function dbCmd() {
  try {
    return require('@alicloud/mpserverless-sdk').db.command;
  } catch {
    return { push: (v) => v }; // fallback
  }
}

class AttachmentDao extends BaseDao {
  constructor(db) {
    super(db, 'evt_attachments');
  }

  async findByEvent(eventId) {
    return this.find({ event_id: eventId }, { sort: { created_at: 1 } });
  }
}

class ProcessActionDao extends BaseDao {
  constructor(db) {
    super(db, 'evt_process_actions');
  }

  async findByEvent(eventId) {
    return this.find({ event_id: eventId }, { sort: { at: -1 } });
  }
}

class CategoryDao extends BaseDao {
  constructor(db) {
    super(db, 'evt_categories');
  }

  async findByOrg(orgId) {
    return this.find({ org_id: orgId }, { sort: { sort_order: 1 } });
  }
}

class EventTypeConfigDao extends BaseDao {
  constructor(db) {
    super(db, 'evt_event_type_configs');
  }

  async findByTypeCode(orgId, typeCode) {
    // 先查组织级，再查全局
    let config = await this.findOne({ org_id: orgId, type_code: typeCode });
    if (!config) {
      config = await this.findOne({ org_id: null, type_code: typeCode });
    }
    return config;
  }
}

module.exports = {
  EventDao,
  AttachmentDao,
  ProcessActionDao,
  CategoryDao,
  EventTypeConfigDao,
};
