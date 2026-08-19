/**
 * server/routes/auth.js
 * 认证路由 — 免登/续签/注销
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../../config');
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const { BizError, ERROR_CODES } = require('../../common/utils/errors');
const dingtalk = require('../../common/dingtalk-client');
const dao = require('../dao-context');

// 初始化钉钉凭证
dingtalk.init({
  appKey: config.dingtalk.appKey,
  appSecret: config.dingtalk.appSecret,
  agentId: config.dingtalk.agentId,
});

// POST /api/auth/login — 钉钉免登
router.post('/login', asyncHandler(async (req, res) => {
  const { authCode } = req.body;
  if (!authCode) {
    throw new BizError(ERROR_CODES.AUTH_CODE_INVALID, 'authCode 不能为空');
  }

  // 1. 调钉钉接口换取用户信息
  const dingUser = await dingtalk.getUserInfoByCode(authCode);
  if (!dingUser || !dingUser.result) {
    throw new BizError(ERROR_CODES.DINGTALK_API_ERROR, '钉钉免登失败', dingUser);
  }

  const { userid: dingUserId, union_id: unionId } = dingUser.result;

  // 2. 获取用户详情
  const dingDetail = await dingtalk.getUserDetail(dingUserId);
  const userInfo = dingDetail.result || {};

  // 3. 创建或更新平台账号
  const { maskMobile, encryptMobile, nowISO } = require('../../common/utils/helper');
  const accountId = await dao.account.upsertByUnionId(unionId, {
    ding_user_id: dingUserId,
    name: userInfo.name || '',
    avatar: userInfo.avatar || '',
    corp_id: userInfo.corp_id || '',
    mobile_masked: maskMobile(userInfo.mobile || ''),
    mobile_encrypted: encryptMobile(userInfo.mobile || ''),
    updated_at: nowISO(),
  });

  // 4. 查询用户所属组织
  const memberships = await dao.membership.findByAccount(accountId, 'ACTIVE');

  // 5. 签发 JWT
  const token = jwt.sign(
    {
      account_id: accountId,
      ding_user_id: dingUserId,
      union_id: unionId,
      roles: memberships.length > 0 ? memberships[0].roles : [],
      org_id: memberships.length > 0 ? memberships[0].org_id : null,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    sessionToken: token,
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
}));

// POST /api/auth/refresh — 续签
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new BizError(ERROR_CODES.TOKEN_INVALID, 'token 不能为空');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true });
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now > config.jwt.refreshWindow) {
      throw new BizError(ERROR_CODES.TOKEN_EXPIRED, '不在续签窗口内');
    }

    const newToken = jwt.sign(
      {
        account_id: payload.account_id,
        ding_user_id: payload.ding_user_id,
        union_id: payload.union_id,
        roles: payload.roles || [],
        org_id: payload.org_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return { sessionToken: newToken };
  } catch (err) {
    if (err instanceof BizError) throw err;
    throw new BizError(ERROR_CODES.TOKEN_INVALID, 'token 无效');
  }
}));

// POST /api/auth/logout — 注销
router.post('/logout', authRequired, asyncHandler(async (req, res) => {
  await dao.auditLog.append({
    category: 'SECURITY',
    actor_id: req.currentUser.account_id,
    action: 'LOGOUT',
    target_type: 'session',
  });
  return { ok: true };
}));

module.exports = router;
