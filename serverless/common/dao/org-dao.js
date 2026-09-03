/**
 * common/dao/org-dao.js
 * 组织数据访问
 */

const BaseDao = require('./base-dao');

class OrgDao extends BaseDao {
  constructor(db) {
    super(db, 'org_organizations');
  }

  async findByCode(orgCode) {
    return this.findOne({ org_code: orgCode });
  }

  async searchByName(keyword) {
    // MongoDB 正则搜索，不区分大小写
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.find(
      { status: 'ACTIVE', name: { $regex: escaped, $options: 'i' } },
      { sort: { created_at: -1 }, limit: 20 }
    );
  }

  async findActive() {
    return this.find({ status: 'ACTIVE' }, { sort: { created_at: -1 } });
  }
}

class MembershipDao extends BaseDao {
  constructor(db) {
    super(db, 'org_memberships');
  }

  async findByAccountAndOrg(accountId, orgId) {
    return this.findOne({ account_id: accountId, org_id: orgId });
  }

  async findByOrg(orgId, status = 'ACTIVE') {
    return this.find({ org_id: orgId, status }, { sort: { joined_at: -1 } });
  }

  async findByAccount(accountId, status = 'ACTIVE') {
    return this.find({ account_id: accountId, status }, { sort: { joined_at: -1 } });
  }
}

class DepartmentDao extends BaseDao {
  constructor(db) {
    super(db, 'org_departments');
  }

  async findByOrg(orgId) {
    return this.find({ org_id: orgId }, { sort: { path: 1 } });
  }
}

module.exports = { OrgDao, MembershipDao, DepartmentDao };
