/**
 * common/dingtalk-client.js
 * 钉钉开放平台 API 封装
 * 
 * 所有钉钉接口调用均走此模块，业务层不直接调钉钉。
 * 迁移其他 IM 平台时替换此文件即可。
 */

const https = require('https');
const http = require('http');

// 钉钉应用凭证（从环境变量或初始化注入，兼容两种命名）
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';
const DINGTALK_API_NEW = 'https://api.dingtalk.com';
let _appKey = process.env.DINGTALK_APP_KEY || process.env.DINGTALK_CLIENT_ID || '';
let _appSecret = process.env.DINGTALK_APP_SECRET || process.env.DINGTALK_CLIENT_SECRET || '';
let _agentId = process.env.DINGTALK_AGENT_ID || '';
let _accessTokenCache = {
  token: '',
  expiresAt: 0,
};

/**
 * 初始化凭证
 */
function init(options = {}) {
  _appKey = options.appKey || _appKey;
  _appSecret = options.appSecret || _appSecret;
  _agentId = options.agentId || _agentId;
}

// ===== HTTP 请求工具 =====

function httpRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ===== access_token 管理 =====

/**
 * 获取企业级 access_token（缓存 + 自动刷新）
 */
async function getAccessToken() {
  const now = Date.now();
  // 提前 5 分钟刷新
  if (_accessTokenCache.token && _accessTokenCache.expiresAt > now + 300000) {
    return _accessTokenCache.token;
  }

  const res = await httpRequest(
    `${DINGTALK_API_BASE}/gettoken?appkey=${_appKey}&appsecret=${_appSecret}`
  );

  if (res.errcode !== 0) {
    throw new Error(`钉钉获取 access_token 失败: ${res.errmsg}`);
  }

  _accessTokenCache = {
    token: res.access_token,
    expiresAt: now + res.expires_in * 1000,
  };

  return res.access_token;
}

// ===== 免登 & 用户 =====

/**
 * 通过 authCode 获取用户信息（旧版接口）
 */
async function getUserInfo(authCode) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/user/getuserinfo?access_token=${token}&code=${authCode}`
  );
}

/**
 * 通过 authCode 获取用户信息（新版接口，推荐）
 */
async function getUserInfoByCode(authCode) {
  return httpRequest(
    `${DINGTALK_API_NEW}/v1.0/oauth2/userinfo`,
    'POST',
    { authCode }
  );
}

/**
 * 获取用户详情
 */
async function getUserDetail(userId) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/topapi/v2/user/get?access_token=${token}&userid=${userId}`
  );
}

/**
 * 通过 unionId 获取 userId
 */
async function getUserIdByUnionId(unionId) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/topapi/user/getuseridbyunionid?access_token=${token}`,
    'POST',
    { unionid: unionId }
  );
}

// ===== 部门 =====

/**
 * 获取部门列表
 */
async function getDepartmentList(deptId = 1) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/topapi/v2/department/listsub?access_token=${token}`,
    'POST',
    { dept_id: deptId }
  );
}

/**
 * 获取部门详情
 */
async function getDepartmentDetail(deptId) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/topapi/v2/department/get?access_token=${token}`,
    'POST',
    { dept_id: deptId }
  );
}

// ===== 工作通知 =====

/**
 * 发送工作通知
 */
async function sendWorkNotice(agentId, userIds, msg) {
  const token = await getAccessToken();
  return httpRequest(
    `${DINGTALK_API_BASE}/topapi/message/corpconversation/asyncsend_v2?access_token=${token}`,
    'POST',
    {
      agent_id: agentId || _agentId,
      userid_list: userIds, // 逗号分隔或数组
      msg,
    }
  );
}

// ===== DING 通知 =====

/**
 * 发送 DING（仅事件发起时使用）
 */
async function createDing(userIds, content) {
  return httpRequest(
    `${DINGTALK_API_NEW}/v1.0/dingtokencorptotopapi/v1/dings/create`,
    'POST',
    {
      DingCreateParam: {
       userid_list: Array.isArray(userIds) ? userIds.join(',') : userIds,
        content,
      },
    }
  );
}

module.exports = {
  init,
  getAccessToken,
  getUserInfo,
  getUserInfoByCode,
  getUserDetail,
  getUserIdByUnionId,
  getDepartmentList,
  getDepartmentDetail,
  sendWorkNotice,
  createDing,
};
