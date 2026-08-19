/**
 * common/utils/helper.js
 * 通用工具函数
 */

/**
 * 生成业务流水号
 * 格式：前缀 + 年月日 + 3位序号  如 LH20260819001
 */
function generateBizNo(prefix, currentNo) {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `${prefix}${dateStr}${String(currentNo).padStart(3, '0')}`;
}

/**
 * 获取当前 ISO 时间字符串（UTC）
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * 安全 JSON 解析
 */
function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * 对象拾取（类似 lodash pick）
 */
function pick(obj, keys) {
  const result = {};
  for (const k of keys) {
    if (obj[k] !== undefined) result[k] = obj[k];
  }
  return result;
}

/**
 * 分页参数标准化
 */
function normalizePagination(params) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(params.size, 10) || 20));
  const skip = (page - 1) * size;
  return { page, size, skip };
}

/**
 * 校验必填字段
 * @param {object} data  数据对象
 * @param {string[]} fields  必填字段列表
 * @throws BizError 缺少字段时抛出
 */
function requireFields(data, fields) {
  const missing = fields.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
  if (missing.length > 0) {
    const { BizError, ERROR_CODES } = require('./errors');
    throw new BizError(ERROR_CODES.INVALID_PARAM, `缺少必填字段: ${missing.join(', ')}`);
  }
}

/**
 * 手机号 AES-256-GCM 加密（占位，实际密钥从 KMS 获取）
 */
function encryptMobile(mobile) {
  // TODO: 对接 KMS 密钥管理
  // 当前阶段返回原文用于开发调试
  return mobile;
}

/**
 * 手机号脱敏
 */
function maskMobile(mobile) {
  if (!mobile || mobile.length < 7) return mobile;
  return mobile.slice(0, 3) + '****' + mobile.slice(-4);
}

module.exports = {
  generateBizNo,
  nowISO,
  safeJSONParse,
  pick,
  normalizePagination,
  requireFields,
  encryptMobile,
  maskMobile,
};
