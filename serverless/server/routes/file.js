/**
 * server/routes/file.js
 * 文件路由 — 上传凭证/确认/下载
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/response');
const { authRequired } = require('../middleware/auth');
const { BizError, ERROR_CODES } = require('../../common/utils/errors');
const config = require('../../config');
const dao = require('../dao-context');

router.use(authRequired);

// POST /api/file/get-upload-token
router.post('/get-upload-token', asyncHandler(async (req, res) => {
  const { file_name, mime, size, event_id } = req.body;

  if (mime && !config.attachment.allowedMimes.includes(mime)) {
    throw new BizError(ERROR_CODES.FILE_TYPE_NOT_ALLOWED, '不支持的文件类型');
  }
  if (size && size > config.attachment.maxSizePerFile) {
    throw new BizError(ERROR_CODES.FILE_SIZE_EXCEEDED, '单文件大小超出限制');
  }

  const ossKey = `orgs/${req.body.org_id || 'default'}/events/${event_id}/${Date.now()}_${file_name}`;
  return { oss_key: ossKey, max_size: config.attachment.maxSizePerFile };
}));

// POST /api/file/confirm-upload
router.post('/confirm-upload', asyncHandler(async (req, res) => {
  const { oss_key, sha256, size, mime, event_id } = req.body;

  const attachmentId = await dao.attachment.insertOne({
    event_id,
    uploader_id: req.currentUser.account_id,
    file_name: oss_key.split('/').pop(),
    mime,
    size,
    oss_key,
    sha256,
    virus_scan_status: 'PENDING',
    created_at: new Date().toISOString(),
  });

  return { attachment_id: attachmentId };
}));

// GET /api/file/get-download-url
router.get('/get-download-url', asyncHandler(async (req, res) => {
  const attachment = await dao.attachment.findById(req.query.file_id);
  if (!attachment) {
    throw new BizError(ERROR_CODES.NOT_FOUND, '附件不存在');
  }

  return {
    download_url: attachment.oss_key,
    file_name: attachment.file_name,
    expire_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}));

module.exports = router;
