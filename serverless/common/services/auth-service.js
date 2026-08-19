/**
 * common/services/auth-service.js
 * 认证服务 — 免登、sessionToken 签发、续签、注销
 */

const { signToken, verifyToken, canRefresh, extractAndVerify } = require('../utils/auth');
const { BizError, ERROR_CODES } = require('../utils/errors');
const dingtalk = require('../dingtalk-client');
const { maskMobile, encryptMobile } = require('../utils/helper');

class AuthService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 钉钉免登
   * @param {string} authCode  小程序端 dd.getAuthCode() 获取
   * @returns {object}  { sessionToken, account, orgs }
   */
  async login(authCode) {
    if (!authCode) {
      throw new BizError(ERROR_CODES.AUTH_CODE_INVALID, 'authCode 不能为空');
    }

    // 1. 调钉钉接口换取 userId
    const dingUser = await dingtalk.getUserInfoByCode(authCode);
    if (!dingUser || !dingUser.result) {
      throw new BizError(ERROR_CODES.DINGTALK_API_ERROR, '钉钉免登失败', dingUser);
    }

    const { userid: dingUserId, union_id: unionId } = dingUser.result;

    // 2. 获取用户详情
    const dingDetail = await dingtalk.getUserDetail(dingUserId);
    const userInfo = dingDetail.result || {};

    // 3. 创建或更新平台账号
    const accountId = await this.dao.account.upsertByUnionId(unionId, {
      ding_user_id: dingUserId,
      name: userInfo.name || '',
      avatar: userInfo.avatar || '',
      corp_id: userInfo.corp_id || '',
      mobile_masked: maskMobile(userInfo.mobile || ''),
      mobile_encrypted: encryptMobile(userInfo.mobile || ''),
      updated_at: new Date().toISOString(),
    });

    // 4. 查询用户所属组织
    const memberships = await this.dao.membership.findByAccount(accountId, 'ACTIVE');
    const orgIds = memberships.map((m) => m.org_id);

    // 5. 签发 sessionToken
    const sessionToken = signToken({
      account_id: accountId,
      ding_user_id: dingUserId,
      union_id: unionId,
      roles: memberships.length > 0 ? memberships[0].roles : [],
    });

    return {
      sessionToken,
      account: {
        id: accountId,
        name: userInfo.name,
        avatar: userInfo.avatar,
        mobile: maskMobile(userInfo.mobile || ''),
      },
      orgs: memberships.map((m) => ({
        org_id: m.org_id,
        roles: m.roles,
      })),
    };
  }

  /**
   * 续签 sessionToken
   */
  async refresh(token) {
    const payload = verifyToken(token);
    if (!payload) {
      throw new BizError(ERROR_CODES.TOKEN_INVALID, 'sessionToken 无效');
    }
    if (!canRefresh(payload)) {
      throw new BizError(ERROR_CODES.TOKEN_EXPIRED, 'sessionToken 已过期，请重新登录');
    }

    const newToken = signToken({
      account_id: payload.account_id,
      ding_user_id: payload.ding_user_id,
      union_id: payload.union_id,
      roles: payload.roles,
    });

    return { sessionToken: newToken };
  }

  /**
   * 注销（加入黑名单，当前简化为客户端删除即可）
   */
  async logout(accountId) {
    // TODO: 写入 token 黑名单到 sys_configs
    await this.dao.auditLog.append({
      category: 'SECURITY',
      actor_id: accountId,
      action: 'LOGOUT',
      target_type: 'session',
    });
    return { ok: true };
  }

  /**
   * 从请求上下文中提取当前用户信息
   * @param {object} event  云函数 event
   * @returns {object}  { account_id, ding_user_id, roles, ... }
   */
  getCurrentUser(event) {
    const payload = extractAndVerify(event);
    if (!payload) {
      throw new BizError(ERROR_CODES.UNAUTHORIZED, '未登录或 sessionToken 已过期');
    }
    return payload;
  }
}

module.exports = AuthService;
