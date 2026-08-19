/**
 * config/index.js
 * 环境配置 — 根据环境变量加载，有合理默认值
 */

module.exports = {
  // 服务端口
  port: process.env.PORT || 3000,

  // MongoDB 连接
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/liuhen_beian',

  // 钉钉应用凭证
  dingtalk: {
    appKey: process.env.DINGTALK_APP_KEY || 'dingb4uqplxslldd9uaa',
    appSecret: process.env.DINGTALK_APP_SECRET || '',
    agentId: process.env.DINGTALK_AGENT_ID || '4598010509',
    apiBase: 'https://oapi.dingtalk.com',
    apiNew: 'https://api.dingtalk.com',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'liuhen-beian-jwt-secret-dev',
    expiresIn: 7200,        // 2小时
    refreshWindow: 1800,    // 最后30分钟可续签
  },

  // DING 通知时间窗口
  dingWindow: { start: 8, end: 22 },

  // 附件限制
  attachment: {
    maxCount: 20,
    maxSizePerFile: 200 * 1024 * 1024,
    maxTotalSize: 1024 * 1024 * 1024,
    allowedMimes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/amr',
      'video/mp4', 'video/3gpp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'application/x-rar-compressed',
    ],
  },

  // 归档
  archiveAutoDays: 7,
};
