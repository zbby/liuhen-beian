/**
 * utils/auth.js
 * 钉钉免登 + 用户认证模块
 */

const { api } = require('./api');

/**
 * 钉钉免登流程：
 * 1. 小程序调用 dd.getAuthCode() 获取 authCode
 * 2. 将 authCode 发送到后端云函数
 * 3. 后端用 authCode 调用钉钉开放接口换取 userId
 * 4. 返回用户信息 + token
 */
function login() {
  return new Promise((resolve, reject) => {
    // 1. 获取钉钉免登授权码
    my.getAuthCode({
      scopes: ['auth_user'],
      success: (res) => {
        const authCode = res.authCode;
        console.log('[auth] 获取 authCode 成功');

        // 2. 调用后端登录接口
        api.auth.login(authCode).then((data) => {
          console.log('[auth] 登录成功:', data.user.name);

          const app = getApp();
          app.saveUserInfo(data.user);

          // 3. 如果有组织信息，一并保存
          if (data.org) {
            app.saveOrgInfo(data.org);
          }

          resolve(data);
        }).catch((err) => {
          console.error('[auth] 后端登录失败:', err);

          // 降级：使用模拟用户数据（开发调试用）
          if (isDevMode()) {
            console.warn('[auth] 降级为模拟用户模式');
            const mockUser = {
              userId: 'dev_admin',
              name: '开发调试用户',
              avatar: '',
              phone: '138****0000',
              deptId: 'dev_dept',
              deptName: '开发部',
              token: 'dev_token_' + Date.now()
            };
            const app = getApp();
            app.saveUserInfo(mockUser);
            resolve({ user: mockUser, org: null });
          } else {
            reject(err);
          }
        });
      },
      fail: (err) => {
        console.error('[auth] 获取 authCode 失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 检查登录状态，未登录则自动触发免登
 */
function ensureLogin() {
  const app = getApp();
  if (app.globalData.isLoggedIn && app.globalData.userInfo) {
    return Promise.resolve(app.globalData.userInfo);
  }
  return login();
}

/**
 * 检查是否已加入组织
 */
function checkOrg() {
  const app = getApp();
  if (app.globalData.hasOrg && app.globalData.orgInfo) {
    return Promise.resolve(app.globalData.orgInfo);
  }
  // 尝试从后端获取
  return api.org.getInfo().then((org) => {
    if (org) {
      app.saveOrgInfo(org);
      return org;
    }
    return null;
  }).catch(() => null);
}

/**
 * 退出登录
 */
function logout() {
  const app = getApp();
  app.logout();
}

/**
 * 是否开发模式（未连接云函数时降级）
 */
function isDevMode() {
  return true; // TODO: 上线前改为 false
}

module.exports = { login, ensureLogin, checkOrg, logout, isDevMode };
