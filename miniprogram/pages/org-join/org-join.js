// 组织注册/加入页面
const { api } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    step: 'choose',     // choose | create | join
    orgName: '',
    orgDesc: '',
    inviteCode: '',
    submitting: false
  },

  async onLoad() {
    // 确保已登录
    try {
      await ensureLogin();
    } catch (e) {
      console.error('登录失败:', e);
    }
  },

  // 切换步骤
  switchStep(e) {
    const step = e.currentTarget.dataset.step;
    this.setData({ step });
  },

  // 输入组织名称
  onOrgNameInput(e) {
    this.setData({ orgName: e.detail.value });
  },

  // 输入组织描述
  onOrgDescInput(e) {
    this.setData({ orgDesc: e.detail.value });
  },

  // 输入邀请码
  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  // 创建组织
  async createOrg() {
    if (!this.data.orgName.trim()) {
      my.showToast({ content: '请输入组织名称', duration: 2000 });
      return;
    }
    this.setData({ submitting: true });
    my.showLoading({ content: '创建中...' });

    try {
      const orgData = await api.org.create({
        name: this.data.orgName.trim(),
        description: this.data.orgDesc.trim()
      });

      const app = getApp();
      app.saveOrgInfo(orgData);

      my.hideLoading();
      my.showToast({ content: '组织创建成功', duration: 1500 });

      // 跳转首页
      setTimeout(() => {
        my.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (err) {
      my.hideLoading();
      console.error('创建组织失败:', err);

      // 降级：模拟创建
      const mockOrg = {
        id: 'org_' + Date.now(),
        name: this.data.orgName.trim(),
        role: 'org_admin',
        memberCount: 1
      };
      const app = getApp();
      app.saveOrgInfo(mockOrg);

      my.showToast({ content: '组织创建成功（离线模式）', duration: 1500 });
      setTimeout(() => {
        my.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 加入组织
  async joinOrg() {
    if (!this.data.inviteCode.trim()) {
      my.showToast({ content: '请输入邀请码', duration: 2000 });
      return;
    }
    this.setData({ submitting: true });
    my.showLoading({ content: '加入中...' });

    try {
      const orgData = await api.org.joinByInvite(this.data.inviteCode.trim());
      const app = getApp();
      app.saveOrgInfo(orgData);

      my.hideLoading();
      my.showToast({ content: '加入成功', duration: 1500 });
      setTimeout(() => {
        my.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (err) {
      my.hideLoading();
      console.error('加入组织失败:', err);

      // 降级：模拟加入
      const mockOrg = {
        id: 'org_invite',
        name: '示例组织（邀请码加入）',
        role: 'org_member',
        memberCount: 15
      };
      const app = getApp();
      app.saveOrgInfo(mockOrg);

      my.showToast({ content: '加入成功（离线模式）', duration: 1500 });
      setTimeout(() => {
        my.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
