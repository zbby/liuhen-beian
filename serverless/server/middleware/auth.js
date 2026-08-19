/**
 * server/middleware/auth.js
 * JWT 认证中间件
 */

const jwt = require('jsonwebtoken');
const config = require('../../config');
const { ERROR_CODES } = require('../../common/utils/errors');

/**
 * 验证 JWT 并注入 req.currentUser
 */
function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ code: ERROR_CODES.UNAUTHORIZED, message: '未登录' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.currentUser = {
      account_id: payload.account_id,
      ding_user_id: payload.ding_user_id,
      union_id: payload.union_id,
      roles: payload.roles || [],
      org_id: payload.org_id || req.headers['x-org-id'] || req.query.org_id,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: ERROR_CODES.TOKEN_EXPIRED, message: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ code: ERROR_CODES.TOKEN_INVALID, message: '登录凭证无效' });
  }
}

/**
 * 可选认证（有 token 就解析，没有就跳过）
 */
function authOptional(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return next();

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.currentUser = {
      account_id: payload.account_id,
      ding_user_id: payload.ding_user_id,
      union_id: payload.union_id,
      roles: payload.roles || [],
      org_id: payload.org_id || req.headers['x-org-id'] || req.query.org_id,
    };
  } catch (err) {
    // 忽略，不阻断
  }
  next();
}

module.exports = { authRequired, authOptional };
