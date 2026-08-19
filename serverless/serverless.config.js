/**
 * serverless/serverless.config.js
 * 钉钉小程序云函数部署配置
 * 
 * 钉钉开发者工具根据此配置自动部署云函数
 */

module.exports = {
  // 云函数配置
  functions: [
    // === HTTP 业务函数 ===
    {
      name: 'auth',
      handler: 'functions/auth/index.handler',
      memory: 512,
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/auth/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'org',
      handler: 'functions/org/index.handler',
      memory: 512,
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/org/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'event',
      handler: 'functions/event/index.handler',
      memory: 512,
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/event/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'approval',
      handler: 'functions/approval/index.handler',
      memory: 512,
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/approval/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'classify',
      handler: 'functions/classify/index.handler',
      memory: 256,
      timeout: 15,
      triggers: [
        {
          type: 'http',
          path: '/classify/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'file',
      handler: 'functions/file/index.handler',
      memory: 1024, // 文件处理需要更多内存
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/file/*',
          methods: ['GET', 'POST'],
        },
      ],
    },
    {
      name: 'notify',
      handler: 'functions/notify/index.handler',
      memory: 256,
      timeout: 15,
      triggers: [
        {
          type: 'http',
          path: '/notify/*',
          methods: ['GET', 'PUT', 'POST'],
        },
      ],
    },
    {
      name: 'audit',
      handler: 'functions/audit/index.handler',
      memory: 256,
      timeout: 15,
      triggers: [
        {
          type: 'http',
          path: '/audit/*',
          methods: ['GET'],
        },
      ],
    },
    {
      name: 'mat',
      handler: 'functions/mat/index.handler',
      memory: 512,
      timeout: 30,
      triggers: [
        {
          type: 'http',
          path: '/mat/*',
          methods: ['GET', 'POST'],
        },
      ],
    },

    // === 定时函数 ===
    {
      name: 'cron-approval-timeout',
      handler: 'functions/cron/approval-timeout.handler',
      memory: 256,
      timeout: 300, // 5 分钟
      triggers: [
        {
          type: 'timer',
          cron: '0 */10 * * * *', // 每 10 分钟
        },
      ],
    },
    {
      name: 'cron-event-auto-archive',
      handler: 'functions/cron/event-auto-archive.handler',
      memory: 256,
      timeout: 300,
      triggers: [
        {
          type: 'timer',
          cron: '0 0 2 * * *', // 每天 02:00
        },
      ],
    },
    {
      name: 'cron-transfer-overdue',
      handler: 'functions/cron/transfer-overdue.handler',
      memory: 256,
      timeout: 300,
      triggers: [
        {
          type: 'timer',
          cron: '0 0 * * * *', // 每小时
        },
      ],
    },

    // === 回调函数 ===
    {
      name: 'callback-dingtalk-contact',
      handler: 'functions/callback/dingtalk-contact.handler',
      memory: 256,
      timeout: 10,
      triggers: [
        {
          type: 'http',
          path: '/callback/dingtalk/contact',
          methods: ['POST'],
        },
      ],
    },
    {
      name: 'callback-oss-virus-scan',
      handler: 'functions/callback/oss-virus-scan.handler',
      memory: 256,
      timeout: 10,
      triggers: [
        {
          type: 'http',
          path: '/callback/oss/virus-scan',
          methods: ['POST'],
        },
      ],
    },
  ],

  // 环境变量 — 凭证由钉钉云自动注入，此处仅配置非敏感项
  environment: {
    JWT_SECRET: '${env.JWT_SECRET}',  // 从部署环境读取
    // DINGTALK_APP_KEY / DINGTALK_APP_SECRET / DINGTALK_AGENT_ID
    // 由钉钉云运行时自动注入，无需手动配置
  },
};
