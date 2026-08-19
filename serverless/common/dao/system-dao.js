/**
 * common/dao/system-dao.js
 * 系统配置、序列号、审计日志数据访问
 */

const BaseDao = require('./base-dao');

class SysConfigDao extends BaseDao {
  constructor(db) {
    super(db, 'sys_configs');
  }

  async findByKey(orgId, key) {
    return this.findOne({ org_id: orgId, key });
  }

  async findByKeyGlobal(key) {
    return this.findOne({ org_id: null, key });
  }

  async upsert(orgId, key, value, updatedBy) {
    const existing = await this.findOne({ org_id: orgId, key });
    if (existing) {
      return this.updateById(existing._id, {
        value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      });
    }
    return this.insertOne({
      org_id: orgId,
      key,
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    });
  }
}

class SequenceDao extends BaseDao {
  constructor(db) {
    super(db, 'sys_sequences');
  }

  /**
   * 获取并递增序列号（原子操作）
   * @param {string} orgId
   * @param {string} prefix  如 LH / RK / CK / ZJ
   * @param {number} year
   * @returns {number} 当前序号
   */
  async nextVal(orgId, prefix, year) {
    const existing = await this.findOne({ org_id: orgId, prefix, year });
    if (existing) {
      // 原子 +1
      await this.collection.doc(existing._id).update({
        current_no: existing.current_no + 1,
      });
      return existing.current_no + 1;
    }
    // 首次
    await this.insertOne({
      org_id: orgId,
      prefix,
      year,
      current_no: 1,
    });
    return 1;
  }
}

class AuditLogDao extends BaseDao {
  constructor(db) {
    super(db, 'aud_audit_logs');
  }

  /**
   * 写入审计日志（仅追加，不可修改）
   */
  async append(logEntry) {
    return this.insertOne({
      ...logEntry,
      at: new Date().toISOString(),
    });
  }

  /**
   * 按组织分页查询
   */
  async findByOrgPaged(orgId, query = {}, options = {}) {
    return this.findPage({ org_id: orgId, ...query }, options);
  }

  /**
   * 按目标查询
   */
  async findByTarget(targetType, targetId, options = {}) {
    return this.findPage(
      { target_type: targetType, target_id: targetId },
      { sort: { at: -1 }, ...options }
    );
  }
}

class NotificationDao extends BaseDao {
  constructor(db) {
    super(db, 'ntf_notifications');
  }

  async findByOrgPaged(orgId, options = {}) {
    return this.findPage({ org_id: orgId }, { sort: { sent_at: -1 }, ...options });
  }
}

class NotifyPreferenceDao extends BaseDao {
  constructor(db) {
    super(db, 'ntf_preferences');
  }

  async findByAccountAndOrg(accountId, orgId) {
    return this.findOne({ account_id: accountId, org_id: orgId });
  }
}

module.exports = {
  SysConfigDao,
  SequenceDao,
  AuditLogDao,
  NotificationDao,
  NotifyPreferenceDao,
};
