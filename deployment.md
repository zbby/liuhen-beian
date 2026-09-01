---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '7a6e661d-45dd-487c-b214-a21a9b336b0c'
  PropagateID: '7a6e661d-45dd-487c-b214-a21a9b336b0c'
  ReservedCode1: '4e8b0c42-1830-4f3c-89e2-76a49fa9f010'
  ReservedCode2: '4e8b0c42-1830-4f3c-89e2-76a49fa9f010'
---

# 留痕备案 - 部署指南

## 项目结构

```
liuhen-filing/
├── miniprogram/              # 钉钉小程序前端
│   ├── app.js               # 小程序入口
│   ├── app.json             # 小程序配置
│   ├── app.acss             # 全局样式
│   └── pages/               # 页面目录
│       ├── index/           # 首页
│       ├── create/          # 发起备案
│       ├── detail/          # 事件详情
│       ├── approval/        # 审批列表
│       ├── history/         # 历史记录
│       └── profile/         # 个人中心
├── backend/                  # 后端服务 (待开发)
│   ├── server.js            # 主服务
│   ├── routes/              # 路由
│   ├── models/              # 数据模型
│   ├── services/            # 业务逻辑
│   └── middleware/          # 中间件
├── README.md                 # 项目说明
└── deployment.md             # 部署指南
```

## 后端服务部署 (ECS: 8.147.61.234)

### 1. 服务器准备

```bash
# SSH 登录
ssh root@8.147.61.234

# 安装 Node.js (如未安装)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2 (进程管理)
npm install -g pm2

# 安装 MySQL (如未安装)
apt-get install -y mysql-server

# 安装 Redis (可选，用于缓存)
apt-get install -y redis-server
```

### 2. 创建项目目录

```bash
mkdir -p /opt/liuhen-filing
cd /opt/liuhen-filing
```

### 3. 初始化后端项目

```bash
npm init -y
npm install express cors body-parser multer jsonwebtoken mysql2 redis dotenv
```

### 4. 环境配置

创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=liuhen_filing

# Redis 配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_change_this

# 钉钉配置
DINGTALK_APP_KEY=your_dingtalk_app_key
DINGTALK_APP_SECRET=your_dingtalk_app_secret
DINGTALK_AGENT_ID=your_agent_id

# 文件存储 (钉钉云存储)
DINGTALK_STORAGE_ENABLED=true
```

### 5. 数据库初始化

```sql
CREATE DATABASE liuhen_filing DEFAULT CHARACTER SET utf8mb4;
USE liuhen_filing;

-- 用户表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  dingtalk_user_id VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 组织表
CREATE TABLE organizations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 组织成员表
CREATE TABLE org_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  org_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 事件表
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  creator_id INT NOT NULL,
  org_id INT NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
  approval_mode ENUM('countersign', 'orSign', 'notifyOnly') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- 附件表
CREATE TABLE attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  file_name VARCHAR(200),
  file_type VARCHAR(50),
  file_url VARCHAR(500),
  dingtalk_media_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- 审批流程表
CREATE TABLE approval_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  approver_id INT NOT NULL,
  approver_name VARCHAR(100),
  role VARCHAR(50),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  comment TEXT,
  approved_at TIMESTAMP NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- 通知人员表
CREATE TABLE notify_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP NULL,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 操作日志表
CREATE TABLE event_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id INT,
  action VARCHAR(100),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 6. 使用 PM2 启动服务

**重要**：确保 `.env` 文件存在于项目根目录，且 `app.js` 已通过 `require('dotenv').config()` 加载环境变量。

```bash
# 安装 dotenv（如果尚未安装）
cd /root/liuhen-beian-server
npm install dotenv

# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'liuhen-beian',
    script: 'server/app.js',
    instances: 1,
    exec_mode: 'fork',
    interpreter_args: '--max-old-space-size=256',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
EOF

# 启动服务（dotenv 会在 app.js 中自动加载 .env）
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

> **注意**：凭证（DINGTALK_APP_SECRET、JWT_SECRET 等）从 `.env` 文件读取，不通过 PM2 env 传入。
> 如果修改了 `.env`，需要 `pm2 restart liuhen-beian` 重启服务使新配置生效。
> 如果修改了 PM2 的 env 配置，需要 `pm2 restart liuhen-beian --update-env`。

### 7. 配置 Nginx (HTTPS + 反向代理)

#### 7.1 主域名配置（WordPress + API 反代共存）

宝塔面板站点配置 `zhangbaoyu.site.conf`，关键是在 WordPress 的 PHP 配置之前加入 API 反代：

```nginx
server {
    listen 80;
    listen 443 ssl;
    listen 443 quic;
    http2 on;
    http3 on;
    server_name zhangbaoyu.site;  # 注意：不含 www
    
    root /www/wwwroot/zhangbaoyu_site;
    
    # SSL 证书（SAN 覆盖 zhangbaoyu.site 和 www.zhangbaoyu.site）
    ssl_certificate    /www/server/panel/vhost/cert/zhangbaoyu.site/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/zhangbaoyu.site/privkey.pem;
    
    # HTTP → HTTPS 强制跳转
    set $isRedcert 1;
    if ($server_port != 443) { set $isRedcert 2; }
    if ( $uri ~ /\.well-known/ ) { set $isRedcert 1; }
    if ($isRedcert != 1) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }
    
    # ===== 留痕备案 API 反向代理 =====
    # 必须在 PHP location 之前，否则被 PHP 拦截
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 50m;
    }
    
    # WordPress PHP 处理（宝塔自动生成）
    include enable-php-74.conf;
    
    # ... 其余宝塔默认配置 ...
}
```

#### 7.2 www 子域重定向配置（防止端口/入口冲突）

**问题背景**：如果 DNS 解析了 `www.zhangbaoyu.site` 到同一 IP，但 Nginx 没有为 `www` 配置独立的 server 块，则 `www` 请求会命中 `0.default.conf`（空白页面），导致从钉钉等入口访问 `www` 时显示空白而非进入小程序。

**解决方案**：创建 `www.zhangbaoyu.site.conf`，将所有 www 流量 301 重定向到主域：

```nginx
# /www/server/panel/vhost/nginx/www.zhangbaoyu.site.conf
server {
    listen 80;
    listen 443 ssl;
    listen 443 quic;
    http2 on;
    http3 on;
    server_name www.zhangbaoyu.site;
    
    # 复用主域 SSL 证书（SAN 已覆盖 www 子域）
    ssl_certificate    /www/server/panel/vhost/cert/zhangbaoyu.site/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/zhangbaoyu.site/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # HTTP → HTTPS
    set $isRedcert 1;
    if ($server_port != 443) { set $isRedcert 2; }
    if ( $uri ~ /\.well-known/ ) { set $isRedcert 1; }
    if ($isRedcert != 1) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }
    
    # 301 重定向到非 www 主域（保留路径和查询参数）
    return 301 https://zhangbaoyu.site$request_uri;
}
```

配置后执行：
```bash
nginx -t && nginx -s reload
```

#### 7.3 验证

```bash
# www 应返回 301 重定向
curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' https://www.zhangbaoyu.site/
# 期望: 301 https://zhangbaoyu.site/

# www API 也应重定向
curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' https://www.zhangbaoyu.site/api/health
# 期望: 301 https://zhangbaoyu.site/api/health

# 主域 API 正常响应
curl -sk https://zhangbaoyu.site/api/health
# 期望: {"code":0,"message":"ok","data":{"status":"running",...}}
```

## 钉钉小程序配置

### 1. 创建钉钉小程序

1. 登录 [钉钉开放平台](https://open-dev.dingtalk.com/)
2. 创建小程序应用
3. 配置 AppKey 和 AppSecret

### 2. 上传小程序代码

```bash
# 使用钉钉开发者工具
# 1. 下载并安装钉钉开发者工具
# 2. 导入 miniprogram 目录
# 3. 配置 AppID
# 4. 上传代码并提交审核
```

### 3. 配置服务器域名

在钉钉开放平台配置：
- request 合法域名：`https://your-domain.com`
- uploadFile 合法域名：`https://your-domain.com`
- downloadFile 合法域名：`https://your-domain.com`

## 安全合规检查清单

### 等保 2.0 要求

- [ ] 身份鉴别：钉钉 OAuth 登录 + JWT Token
- [ ] 访问控制：基于角色的权限管理
- [ ] 安全审计：完整操作日志记录
- [ ] 数据完整性：数据库事务 + 校验和
- [ ] 数据保密性：HTTPS 传输 + 敏感数据加密
- [ ] 备份恢复：定期数据库备份

### 隐私保护

- [ ] 最小必要原则：仅收集必要信息
- [ ] 用户知情同意：隐私政策说明
- [ ] 数据脱敏：展示时脱敏处理
- [ ] 数据保留期限：设置合理的保留策略

## 下一步开发

### 后端 API (优先级)

1. **认证模块**
   - [ ] 钉钉 OAuth 登录
   - [ ] JWT Token 生成和验证

2. **事件管理**
   - [ ] 创建事件 API
   - [ ] 事件列表 API
   - [ ] 事件详情 API
   - [ ] 文件上传 API (钉钉云存储)

3. **审批流程**
   - [ ] 审批人配置 API
   - [ ] 审批操作 API
   - [ ] 审批状态流转

4. **通知服务**
   - [ ] 钉钉消息推送
   - [ ] 事件发起时 Ding 通知

5. **自动分类**
   - [ ] 关键词匹配逻辑
   - [ ] 分类规则配置

### 前端完善

- [ ] 登录页面
- [ ] 组织管理页面
- [ ] 选人组件集成
- [ ] 文件上传优化
- [ ] 消息通知展示

---

**部署时间**: 2026-05-20
**目标服务器**: 8.147.61.234 (iZ0jl3andamxtqhl31cza7Z)

> AI生成