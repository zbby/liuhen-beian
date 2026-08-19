/**
 * utils/api.js
 * API 封装层 - 同时支持钉钉云函数调用和传统 HTTP 请求
 * 顶层导出 initCloud 和 cloud 对象
 */

// ===== 钉钉小程序云初始化 =====
function initCloud() {
  // 钉钉小程序云 Serverless 初始化
  // 实际环境中需要依赖 @alicloud/mpserverless-sdk
  try {
    if (typeof mpserverless !== 'undefined') {
      console.log('[api] 钉钉云 Serverless 已就绪');
    } else {
      console.warn('[api] 钉钉云 SDK 未加载，降级为本地模拟模式');
    }
  } catch (e) {
    console.error('[api] 云初始化失败:', e);
  }
}

// ===== 通用请求封装 =====
function request(options) {
  const app = getApp();
  const { url, method = 'GET', data = {} } = options;

  // 云函数模式：通过 cloud.function.invoke 调用
  if (app.globalData.backendMode === 'cloud' && typeof mpserverless !== 'undefined') {
    return invokeCloudFunction(url, data);
  }

  // HTTP 模式：传统 REST 请求
  return httpRequest({
    url: app.globalData.apiBaseUrl + url,
    method,
    data,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': app.globalData.userInfo ? `Bearer ${app.globalData.userInfo.token || ''}` : ''
    }
  });
}

// ===== 钉钉云函数调用 =====
function invokeCloudFunction(funcName, data) {
  return new Promise((resolve, reject) => {
    mpserverless.function.invoke(funcName, data, (err, res) => {
      if (err) {
        console.error(`[cloud] ${funcName} 调用失败:`, err);
        reject(err);
      } else if (res && res.code === 0) {
        resolve(res.data);
      } else {
        console.error(`[cloud] ${funcName} 业务错误:`, res);
        reject(res);
      }
    });
  });
}

// ===== HTTP 请求 =====
function httpRequest(options) {
  const { url, method, data, headers } = options;
  return new Promise((resolve, reject) => {
    my.request({
      url,
      method,
      data,
      headers,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data || { message: '请求失败' });
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// ===== API 接口定义 =====
const api = {
  // -- 认证 --
  auth: {
    // 钉钉免登
    login: (authCode) => request({ url: '/auth/login', method: 'POST', data: { authCode } }),
    // 获取用户信息
    getUserInfo: () => request({ url: '/auth/userinfo' }),
    // 切换组织
    switchOrg: (orgId) => request({ url: '/auth/switch-org', method: 'POST', data: { orgId } })
  },

  // -- 组织 --
  org: {
    // 创建组织
    create: (orgData) => request({ url: '/org/create', method: 'POST', data: orgData }),
    // 加入组织（邀请码）
    join: (inviteCode) => request({ url: '/org/join', method: 'POST', data: { inviteCode } }),
    // 获取组织信息
    getInfo: () => request({ url: '/org/info' }),
    // 获取成员列表
    getMembers: (page = 1, size = 20) => request({ url: '/org/members', data: { page, size } }),
    // 生成邀请码
    genInviteCode: () => request({ url: '/org/invite-code', method: 'POST' }),
    // 退出组织
    leave: () => request({ url: '/org/leave', method: 'POST' })
  },

  // -- 事件 --
  event: {
    // 创建事件
    create: (eventData) => request({ url: '/event/create', method: 'POST', data: eventData }),
    // 获取事件详情
    getDetail: (eventId) => request({ url: `/event/${eventId}` }),
    // 获取事件列表
    getList: (params) => request({ url: '/event/list', data: params }),
    // 获取我发起的
    getMyEvents: (page = 1, size = 20) => request({ url: '/event/my', data: { page, size } }),
    // 获取待审批
    getPendingApprovals: (page = 1, size = 20) => request({ url: '/event/pending', data: { page, size } }),
    // 获取历史（归档）
    getHistory: (params) => request({ url: '/event/history', data: params }),
    // 撤回事件
    withdraw: (eventId) => request({ url: `/event/${eventId}/withdraw`, method: 'POST' }),
    // 搜索事件
    search: (keyword, page = 1) => request({ url: '/event/search', data: { keyword, page } })
  },

  // -- 附件 --
  attachment: {
    // 上传附件（钉钉云存储）
    upload: (filePath, fileType) => request({
      url: '/attachment/upload',
      method: 'POST',
      data: { filePath, fileType }
    }),
    // 获取附件下载链接
    getUrl: (fileId) => request({ url: `/attachment/${fileId}/url` }),
    // 删除附件
    delete: (fileId) => request({ url: `/attachment/${fileId}`, method: 'DELETE' })
  },

  // -- 审批 --
  approval: {
    // 提交审批意见
    submit: (flowId, action, comment, extra) => request({
      url: `/approval/${flowId}/submit`,
      method: 'POST',
      data: { action, comment, ...extra }
    }),
    // 获取审批流详情
    getFlow: (flowId) => request({ url: `/approval/${flowId}` }),
    // 转办
    transfer: (flowId, toUserId) => request({
      url: `/approval/${flowId}/transfer`,
      method: 'POST',
      data: { toUserId }
    }),
    // 加签
    addCounterSigner: (flowId, userIds) => request({
      url: `/approval/${flowId}/add-signer`,
      method: 'POST',
      data: { userIds }
    }),
    // 获取审批模板列表
    getTemplates: () => request({ url: '/approval/templates' })
  },

  // -- 通知 --
  notify: {
    // 发送 Ding 通知
    sendDing: (userIds, eventId) => request({
      url: '/notify/ding',
      method: 'POST',
      data: { userIds, eventId }
    }),
    // 发送工作通知
    sendWorkNotice: (userIds, content) => request({
      url: '/notify/work',
      method: 'POST',
      data: { userIds, content }
    })
  },

  // -- 甲供材 --
  material: {
    // 仪表盘统计
    getDashboard: () => request({ url: '/material/dashboard' }),
    // 获取甲供材列表
    getList: (params) => request({ url: '/material/list', data: params }),
    // 入库
    stockIn: (data) => request({ url: '/material/stock-in', method: 'POST', data }),
    // 出库
    stockOut: (data) => request({ url: '/material/stock-out', method: 'POST', data }),
    // 转借
    borrow: (data) => request({ url: '/material/borrow', method: 'POST', data }),
    // 归还
    return: (data) => request({ url: '/material/return', method: 'POST', data }),
    // 获取流转记录
    getFlowLog: (materialId) => request({ url: `/material/${materialId}/flow-log` })
  },

  // -- 审计 --
  audit: {
    // 获取操作日志
    getLogs: (params) => request({ url: '/audit/logs', data: params })
  }
};

module.exports = { initCloud, request, api };
