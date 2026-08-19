/**
 * utils/api.js
 * API 封装层 - 同时支持钉钉云函数调用和传统 HTTP 请求
 * 
 * 云函数模式下，url 路径的第一段作为函数名，其余作为 path 传给函数
 * 如 /auth/login → 函数名 auth, path /auth/login
 * 如 /event/list → 函数名 event, path /event/list
 * 如 /mat/inventory → 函数名 mat, path /mat/inventory
 */

// ===== 钉钉小程序云初始化 =====
function initCloud() {
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

// ===== 从 URL 提取云函数名 =====
function extractFunctionName(url) {
  // /auth/login → auth
  // /org/list → org
  // /event/submit → event
  // /approval/act → approval
  // /mat/inventory → mat
  // /classify/predict → classify
  // /file/get-upload-token → file
  // /notify/preferences → notify
  // /audit/list → audit
  const match = url.match(/^\/([a-z_-]+)/);
  return match ? match[1] : '';
}

// ===== 通用请求封装 =====
function request(options) {
  const app = getApp();
  const { url, method = 'GET', data = {} } = options;

  // 云函数模式：通过 mpserverless.function.invoke 调用
  if (app.globalData.backendMode === 'cloud' && typeof mpserverless !== 'undefined') {
    return invokeCloudFunction(url, method, data);
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
function invokeCloudFunction(url, method, data) {
  const funcName = extractFunctionName(url);
  if (!funcName) {
    return Promise.reject({ message: `无法从 URL 提取云函数名: ${url}` });
  }

  return new Promise((resolve, reject) => {
    const params = {
      path: url,
      method,
      body: method === 'POST' || method === 'PUT' ? data : undefined,
      queryParameters: method === 'GET' ? data : undefined,
      headers: {
        'Authorization': getApp().globalData.userInfo
          ? `Bearer ${getApp().globalData.userInfo.token || ''}` : ''
      },
    };

    mpserverless.function.invoke(funcName, params, (err, res) => {
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
// 路径与后端云函数的路由一一对应
const api = {
  // -- 认证 --
  auth: {
    login: (authCode) => request({ url: '/auth/login', method: 'POST', data: { authCode } }),
    refresh: (token) => request({ url: '/auth/refresh', method: 'POST', data: { token } }),
    logout: () => request({ url: '/auth/logout', method: 'POST' }),
  },

  // -- 组织 --
  org: {
    list: () => request({ url: '/org/list' }),
    create: (orgData) => request({ url: '/org/create', method: 'POST', data: orgData }),
    joinByInvite: (inviteCode) => request({ url: '/org/join-by-invite', method: 'POST', data: { inviteCode } }),
    getMembers: (orgId, page = 1, size = 20) => request({ url: '/org/members', data: { org_id: orgId, page, size } }),
    leave: (orgId) => request({ url: '/org/leave', method: 'POST', data: { org_id: orgId } }),
    genInviteCode: () => request({ url: '/org/gen-invite-code', method: 'POST' }),
  },

  // -- 事件 --
  event: {
    typeList: () => request({ url: '/event/type-list' }),
    submit: (eventData) => request({ url: '/event/submit', method: 'POST', data: eventData }),
    list: (params) => request({ url: '/event/list', data: params }),
    detail: (eventId) => request({ url: '/event/detail', data: { event_id: eventId } }),
    cancel: (eventId) => request({ url: '/event/cancel', method: 'POST', data: { event_id: eventId } }),
    process: (eventId, actionType, payload) => request({
      url: '/event/process', method: 'POST', data: { event_id: eventId, action_type: actionType, payload }
    }),
  },

  // -- 附件/文件 --
  file: {
    getUploadToken: (data) => request({ url: '/file/get-upload-token', method: 'POST', data }),
    confirmUpload: (data) => request({ url: '/file/confirm-upload', method: 'POST', data }),
    getDownloadUrl: (fileId) => request({ url: '/file/get-download-url', data: { file_id: fileId } }),
  },

  // -- 审批 --
  approval: {
    getTemplates: (orgId, eventType) => request({ url: '/approval/templates', data: { org_id: orgId, event_type: eventType } }),
    getPending: (page = 1, size = 20) => request({ url: '/approval/pending', data: { page, size } }),
    act: (flowId, action, comment, extra) => request({
      url: '/approval/act', method: 'POST', data: { flow_id: flowId, action, comment, extra: extra || {} }
    }),
    addSigner: (flowId, userIds) => request({
      url: '/approval/add-signer', method: 'POST', data: { flow_id: flowId, user_ids: userIds }
    }),
  },

  // -- 分类 --
  classify: {
    predict: (title, description, eventType) => request({
      url: '/classify/predict', method: 'POST', data: { title, description, event_type: eventType }
    }),
  },

  // -- 通知 --
  notify: {
    getPreferences: (orgId) => request({ url: '/notify/preferences', data: { org_id: orgId } }),
    updatePreferences: (orgId, updates) => request({
      url: '/notify/preferences', method: 'PUT', data: { org_id: orgId, ...updates }
    }),
  },

  // -- 甲供材 --
  material: {
    getDashboard: (orgId) => request({ url: '/mat/report', data: { org_id: orgId } }),
    getInventory: (params) => request({ url: '/mat/inventory', data: params }),
    stockIn: (data) => request({ url: '/mat/stock-in', method: 'POST', data }),
    stockOut: (data) => request({ url: '/mat/stock-out', method: 'POST', data }),
    transfer: (data) => request({ url: '/mat/transfer', method: 'POST', data }),
    returnMaterial: (data) => request({ url: '/mat/return', method: 'POST', data }),
  },

  // -- 审计 --
  audit: {
    getLogs: (params) => request({ url: '/audit/list', data: params }),
  },
};

module.exports = { initCloud, request, api };
