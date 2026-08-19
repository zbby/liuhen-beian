/**
 * common/dao/account-dao.js
 * 账号数据访问
 */

const BaseDao = require('./base-dao');

class AccountDao extends BaseDao {
  constructor(db) {
    super(db, 'org_accounts');
  }

  /**
   * 按 unionId 查找
   */
  async findByUnionId(unionId) {
    return this.findOne({ union_id: unionId });
  }

  /**
   * 按 dingUserId 查找
   */
  async findByDingUserId(userId) {
    return this.findOne({ ding_user_id: userId });
  }

  /**
   * 创建或更新账号（钉钉免登后）
   */
  async upsertByUnionId(unionId, update) {
    const existing = await this.findByUnionId(unionId);
    if (existing) {
      await this.updateById(existing._id, update);
      return existing._id;
    }
    const doc = {
      union_id: unionId,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...update,
    };
    return this.insertOne(doc);
  }
}

module.exports = AccountDao;
