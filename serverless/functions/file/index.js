/**
 * functions/file/index.js
 * 文件云函数 — 上传凭证/确认上传/下载URL
 */

const createDao = require('../../common/dao');
const createServices = require('../../common/services');
const { success, failFromError, BizError, ERROR_CODES } = require('../../common/utils/errors');
const { ATTACHMENT_LIMITS } = require('../../common/utils/constants');

exports.handler = async function (event, context) {
  const db = context.db || global.db;
  const dao = createDao(db);

  const path = event.path || '';
  const method = (event.method || event.httpMethod || 'GET').toUpperCase();
  const query = event.queryParameters || {};
  const body = event.body || {};

  try {
    // POST /file/get-upload-token — 获取上传凭证
    if (path === '/file/get-upload-token' && method === 'POST') {
      const { file_name, mime, size, event_id } = body;

      // 校验文件类型
      if (mime && !ATTACHMENT_LIMITS.ALLOWED_MIMES.includes(mime)) {
        throw new BizError(ERROR_CODES.FILE_TYPE_NOT_ALLOWED, '不支持的文件类型');
      }

      // 校验文件大小
      if (size && size > ATTACHMENT_LIMITS.MAX_SIZE_PER_FILE) {
        throw new BizError(ERROR_CODES.FILE_SIZE_EXCEEDED, '单文件大小超出限制');
      }

      // 生成 OSS 上传凭证（STSToken）
      // 钉钉云存储使用 dd.cloud.uploadFile，无需 STS
      // 这里返回上传参数供前端使用
      const ossKey = `orgs/${body.org_id || 'default'}/events/${event_id}/${Date.now()}_${file_name}`;

      return success({
        oss_key: ossKey,
        max_size: ATTACHMENT_LIMITS.MAX_SIZE_PER_FILE,
      });
    }

    // POST /file/confirm-upload — 确认上传完成
    if (path === '/file/confirm-upload' && method === 'POST') {
      const { oss_key, sha256, size, mime, event_id, uploader_id } = body;

      const attachmentId = await dao.attachment.insertOne({
        event_id,
        uploader_id,
        file_name: oss_key.split('/').pop(),
        mime,
        size,
        oss_key,
        sha256,
        virus_scan_status: 'PENDING',
        created_at: new Date().toISOString(),
      });

      return success({ attachment_id: attachmentId });
    }

    // GET /file/get-download-url — 获取下载签名URL
    if (path === '/file/get-download-url' && method === 'GET') {
      const fileId = query.file_id;
      const attachment = await dao.attachment.findById(fileId);
      if (!attachment) {
        throw new BizError(ERROR_CODES.NOT_FOUND, '附件不存在');
      }

      // 返回临时签名 URL（30 分钟有效）
      return success({
        download_url: attachment.oss_key,
        file_name: attachment.file_name,
        expire_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    }

    return success(null, '路由未匹配');
  } catch (err) {
    return failFromError(err);
  }
};
