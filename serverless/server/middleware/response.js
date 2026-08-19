/**
 * server/middleware/response.js
 * 统一响应封装中间件
 */

const { success, failFromError } = require('../../common/utils/errors');

/**
 * 包装 async 路由处理器，自动捕获错误并返回标准格式
 */
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res, next);
      if (result !== undefined && !res.headersSent) {
        res.json(success(result));
      }
    } catch (err) {
      if (!res.headersSent) {
        res.json(failFromError(err));
      }
    }
  };
}

module.exports = { asyncHandler };
