#!/bin/bash
# deploy-to-ecs.sh
# 部署后端服务到 ECS 服务器
# 
# 使用方式：在本地执行，通过 scp + ssh 部署
# 前提：已配置 SSH 免密登录或使用密码

ECS_HOST="8.147.61.234"
ECS_USER="root"
REMOTE_DIR="/root/liuhen-beian-server"

echo "===== 留痕报备后端部署 ====="
echo "目标: ${ECS_USER}@${ECS_HOST}:${REMOTE_DIR}"
echo ""

# 1. 上传代码
echo "[1/5] 上传代码..."
scp -r ./serverless/ ${ECS_USER}@${ECS_HOST}:${REMOTE_DIR}/

# 2. 安装依赖
echo "[2/5] 安装 npm 依赖..."
ssh ${ECS_USER}@${ECS_HOST} "cd ${REMOTE_DIR} && npm install --production"

# 3. 检查 MongoDB
echo "[3/5] 检查 MongoDB..."
ssh ${ECS_USER}@${ECS_HOST} "which mongod || echo 'MongoDB 未安装'"

# 4. 初始化数据库
echo "[4/5] 初始化数据库..."
ssh ${ECS_USER}@${ECS_HOST} "cd ${REMOTE_DIR} && node scripts/init-db.js"

# 5. 启动服务
echo "[5/5] 启动服务..."
ssh ${ECS_USER}@${ECS_HOST} "cd ${REMOTE_DIR} && pm2 start server/app.js --name liuhen-beian || (node server/app.js &)"

echo ""
echo "===== 部署完成 ====="
echo "健康检查: curl http://${ECS_HOST}:3000/api/health"
