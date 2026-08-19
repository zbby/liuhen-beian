/**
 * common/utils/errors.js
 * 统一错误定义
 */

class BizError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

// 预定义错误码
const ERROR_CODES = {
  // 通用 1xxx
  OK: 0,
  INVALID_PARAM: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  INTERNAL: 1999,

  // 认证 2xxx
  AUTH_CODE_INVALID: 2001,
  TOKEN_EXPIRED: 2002,
  TOKEN_INVALID: 2003,
  DINGTALK_API_ERROR: 2004,

  // 组织 3xxx
  ORG_NOT_FOUND: 3001,
  ORG_ALREADY_MEMBER: 3002,
  ORG_INVITE_CODE_INVALID: 3003,
  ORG_PERMISSION_DENIED: 3004,

  // 事件 4xxx
  EVENT_NOT_FOUND: 4001,
  EVENT_STATUS_INVALID: 4002,
  EVENT_CANNOT_WITHDRAW: 4003,

  // 审批 5xxx
  APPROVAL_NOT_FOUND: 5001,
  APPROVAL_NOT_AUTHORIZED: 5002,
  APPROVAL_ALREADY_PROCESSED: 5003,
  APPROVAL_TEMPLATE_NOT_FOUND: 5004,

  // 甲供材 6xxx
  MATERIAL_NOT_FOUND: 6001,
  MATERIAL_INSUFFICIENT_STOCK: 6002,
  MATERIAL_INVALID_OPERATION: 6003,

  // 文件 7xxx
  FILE_TYPE_NOT_ALLOWED: 7001,
  FILE_SIZE_EXCEEDED: 7002,
  FILE_VIRUS_DETECTED: 7003,

  // 分类 8xxx
  CLASSIFY_NO_MATCH: 8001,
};

/**
 * 生成标准响应体
 */
function success(data = null, message = 'ok') {
  return { code: 0, message, data };
}

/**
 * 生成标准错误响应体
 */
function fail(code, message, detail) {
  return { code, message, detail: detail || undefined };
}

/**
 * 从 BizError 生成响应体
 */
function failFromError(err) {
  if (err instanceof BizError) {
    return fail(err.code, err.message, err.detail);
  }
  console.error('[UNEXPECTED]', err);
  return fail(ERROR_CODES.INTERNAL, '服务器内部错误');
}

module.exports = {
  BizError,
  ERROR_CODES,
  success,
  fail,
  failFromError,
};
