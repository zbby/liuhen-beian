/**
 * common/utils/auth.js
 * JWT sessionToken 签发与校验（云函数内使用）
 * 
 * 钉钉小程序云函数内没有第三方 JWT 库，
 * 这里使用 HMAC-SHA256 手动实现精简 JWT
 */

const crypto = require('crypto');

// JWT 密钥（生产环境从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'liuhen-beian-jwt-secret-dev';
const JWT_EXPIRES_IN = 7200; // 2小时（秒）
const JWT_REFRESH_WINDOW = 1800; // 最后30分钟可续签

/**
 * Base64URL 编码
 */
function base64urlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * 签发 sessionToken
 * @param {object} payload  { account_id, org_id, roles, ding_user_id }
 * @returns {string} JWT
 */
function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + JWT_EXPIRES_IN;

  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: now,
    exp,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const bodyB64 = base64urlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${bodyB64}.${signature}`;
}

/**
 * 校验 sessionToken
 * @param {string} token  JWT
 * @returns {object|null} 解码后的 payload，过期/无效返回 null
 */
function verifyToken(token) {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, signature] = parts;

  // 验签
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) return null;

  // 解码
  try {
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64').toString());
    const now = Math.floor(Date.now() / 1000);

    // 过期检查
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * 检查是否可续签（在过期窗口内）
 * @param {object} payload  已解码的 payload
 * @returns {boolean}
 */
function canRefresh(payload) {
  if (!payload || !payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now <= JWT_REFRESH_WINDOW;
}

/**
 * 从云函数请求头中提取并验证 sessionToken
 * @param {object} event  云函数 event 对象
 * @returns {object|null} 解码后的 payload
 */
function extractAndVerify(event) {
  const authHeader =
    (event.headers && event.headers['Authorization']) ||
    (event.headers && event.headers['authorization']) ||
    (event.queryParameters && event.queryParameters.token) ||
    '';

  if (!authHeader) return null;

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  return verifyToken(token);
}

module.exports = {
  signToken,
  verifyToken,
  canRefresh,
  extractAndVerify,
  JWT_EXPIRES_IN,
  JWT_REFRESH_WINDOW,
};
