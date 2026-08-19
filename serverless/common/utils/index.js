/**
 * common/utils/index.js
 * 统一导出
 */

const { BizError, ERROR_CODES, success, fail, failFromError } = require('./errors');
const helper = require('./helper');
const constants = require('./constants');
const authUtil = require('./auth');

module.exports = {
  BizError,
  ERROR_CODES,
  success,
  fail,
  failFromError,
  ...helper,
  constants,
  authUtil,
};
