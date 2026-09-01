/**
 * server/app.js
 * Express HTTP 服务入口
 * 
 * 留痕备案 + 甲供材流转后端
 */

// ===== 必须在所有其他 require 之前加载 .env =====
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('../config');

// 路由
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/org');
const eventRoutes = require('./routes/event');
const approvalRoutes = require('./routes/approval');
const classifyRoutes = require('./routes/classify');
const fileRoutes = require('./routes/file');
const notifyRoutes = require('./routes/notify');
const auditRoutes = require('./routes/audit');
const matRoutes = require('./routes/mat');
const callbackRoutes = require('./routes/callback');

const app = express();

// ===== 中间件 =====
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'running', time: new Date().toISOString() } });
});

// ===== API 根路径 =====
app.get('/api/', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { service: 'liuhen-beian', version: '1.0.0' } });
});
app.get('/api', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { service: 'liuhen-beian', version: '1.0.0' } });
});

// ===== 路由挂载 =====
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/classify', classifyRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/mat', matRoutes);
app.use('/api/callback', callbackRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ code: 1004, message: `路由不存在: ${req.method} ${req.path}` });
});

// ===== 全局错误处理 =====
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ code: 1999, message: '服务器内部错误', detail: err.message });
});

// ===== 启动 =====
async function start() {
  // 连接 MongoDB
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[MongoDB] 连接成功:', config.mongoUri);
  } catch (err) {
    console.error('[MongoDB] 连接失败:', err.message);
    console.error('请确保 MongoDB 已安装并运行在 localhost:27017');
    process.exit(1);
  }

  // 启动 HTTP 服务
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[留痕备案] 后端服务已启动: http://0.0.0.0:${config.port}`);
    console.log(`[留痕备案] API 基础路径: https://zhangbaoyu.site/api`);
    console.log(`[留痕备案] 健康检查: https://zhangbaoyu.site/api/health`);
  });
}

start();
