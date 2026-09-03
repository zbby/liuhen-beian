/**
 * common/services/org-service.js
 * 组织服务 — 创建/加入/退出/成员管理
 */

const { BizError, ERROR_CODES, nowISO, requireFields } = require('../utils/helper');
const { ACCOUNT_STATUS, MEMBERSHIP_STATUS } = require('../utils/constants');

class OrgService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 创建组织
   */
  async create(accountId, orgData) {
    requireFields(orgData, ['name']);

    const orgCode = this._generateOrgCode();

    const orgId = await this.dao.org.insertOne({
      org_code: orgCode,
      name: orgData.name,
      type: orgData.type || 'INTERNAL',
      creator_id: accountId,
      status: 'ACTIVE',
      settings: {
        default_approval_template_id: null,
        auto_classify_enabled: true,
        archive_auto_days: 7,
      },
      created_at: nowISO(),
      updated_at: nowISO(),
    });

    // 创建者自动成为成员
    await this.dao.membership.insertOne({
      account_id: accountId,
      org_id: orgId,
      roles: ['ADMIN'],
      data_scopes: [{ role: 'ADMIN', scope_type: 'ALL' }],
      status: MEMBERSHIP_STATUS.ACTIVE,
      joined_at: nowISO(),
    });

    return { org_id: orgId, org_code: orgCode };
  }

  /**
   * 通过邀请码加入
   */
  async joinByInvite(accountId, inviteCode) {
    const org = await this.dao.org.findByCode(inviteCode);
    if (!org) throw new BizError(ERROR_CODES.ORG_NOT_FOUND, '邀请码无效');

    const existing = await this.dao.membership.findByAccountAndOrg(accountId, org._id);
    if (existing && existing.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new BizError(ERROR_CODES.ORG_ALREADY_MEMBER, '您已是该组织成员');
    }

    if (existing) {
      // 重新激活
      await this.dao.membership.updateById(existing._id, {
        status: MEMBERSHIP_STATUS.ACTIVE,
        joined_at: nowISO(),
      });
    } else {
      await this.dao.membership.insertOne({
        account_id: accountId,
        org_id: org._id,
        roles: ['MEMBER'],
        data_scopes: [{ role: 'MEMBER', scope_type: 'SELF' }],
        status: MEMBERSHIP_STATUS.ACTIVE,
        joined_at: nowISO(),
      });
    }

    return { org_id: org._id, org_name: org.name };
  }

  /**
   * 按名称搜索组织
   */
  async searchOrgs(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      return [];
    }
    const orgs = await this.dao.org.searchByName(keyword.trim());
    return orgs.map(o => ({
      org_id: o._id,
      name: o.name,
      org_code: o.org_code,
      type: o.type,
      created_at: o.created_at,
    }));
  }

  /**
   * 通过组织ID加入（直接加入，无需邀请码）
   */
  async joinById(accountId, orgId) {
    const org = await this.dao.org.findById(orgId);
    if (!org) throw new BizError(ERROR_CODES.ORG_NOT_FOUND, '组织不存在');

    const existing = await this.dao.membership.findByAccountAndOrg(accountId, org._id);
    if (existing && existing.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new BizError(ERROR_CODES.ORG_ALREADY_MEMBER, '您已是该组织成员');
    }

    if (existing) {
      await this.dao.membership.updateById(existing._id, {
        status: MEMBERSHIP_STATUS.ACTIVE,
        joined_at: nowISO(),
      });
    } else {
      await this.dao.membership.insertOne({
        account_id: accountId,
        org_id: org._id,
        roles: ['MEMBER'],
        data_scopes: [{ role: 'MEMBER', scope_type: 'SELF' }],
        status: MEMBERSHIP_STATUS.ACTIVE,
        joined_at: nowISO(),
      });
    }

    return { org_id: org._id, org_name: org.name };
  }

  /**
   * 我的组织列表
   */
  async listMyOrgs(accountId) {
    const memberships = await this.dao.membership.findByAccount(accountId);
    const result = [];

    for (const m of memberships) {
      const org = await this.dao.org.findById(m.org_id);
      if (org) {
        result.push({
          org_id: org._id,
          name: org.name,
          org_code: org.org_code,
          roles: m.roles,
          joined_at: m.joined_at,
        });
      }
    }

    return result;
  }

  /**
   * 组织成员列表
   */
  async listMembers(orgId, options = {}) {
    const { page = 1, size = 20 } = options;
    const memberships = await this.dao.membership.findByOrg(orgId);

    const members = [];
    for (const m of memberships) {
      const account = await this.dao.account.findById(m.account_id);
      members.push({
        account_id: m.account_id,
        name: account?.name || '',
        avatar: account?.avatar || '',
        roles: m.roles,
        joined_at: m.joined_at,
      });
    }

    return members;
  }

  /**
   * 退出组织
   */
  async leave(accountId, orgId) {
    const membership = await this.dao.membership.findByAccountAndOrg(accountId, orgId);
    if (!membership) throw new BizError(ERROR_CODES.ORG_NOT_FOUND, '不是该组织成员');

    await this.dao.membership.updateById(membership._id, {
      status: MEMBERSHIP_STATUS.LEFT,
      left_at: nowISO(),
    });

    return { ok: true };
  }

  // ===== 内部 =====

  _generateOrgCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LH';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = OrgService;
