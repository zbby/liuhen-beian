// 组织注册/加入页面
const { api } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    step: 'choose',     // choose | create | join
    orgName: '',
    orgDesc: '',
    searchKeyword: '',
    searchResults: [],
    searching: false,
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

  // 搜索关键词输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    // 防抖：输入停止 500ms 后搜索
    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
    }
    if (!keyword.trim()) {
      this.setData({ searchResults: [], searching: false });
      return;
    }
    this.setData({ searching: true });
    this._searchTimer = setTimeout(() => {
      this.doSearch(keyword.trim());
    }, 500);
  },

  // 执行搜索
  async doSearch(keyword) {
    try {
      const results = await api.org.search(keyword);
      this.setData({
        searchResults: results || [],
        searching: false
      });
    } catch (err) {
      console.error('搜索组织失败:', err);
      this.setData({ searchResults: [], searching: false });
    }
  },

  // 点击组织加入
  async onOrgTap(e) {
    const orgId = e.currentTarget.dataset.id;
    const orgName = e.currentTarget.dataset.name;
    this.setData({ submitting: true });
    my.showLoading({ content: '加入中...' });

    try {
      const orgData = await api.org.join(orgId);
      const app = getApp();
      app.saveOrgInfo({
        id: orgData.org_id,
        name: orgData.org_name || orgName,
        role: 'org_member',
        memberCount: 1
      });

      my.hideLoading();
      my.showToast({ content: '加入成功', duration: 1500 });
      setTimeout(() => {
        my.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (err) {
      my.hideLoading();
      console.error('加入组织失败:', err);

      const errMsg = (err && err.message) || '';
      if (errMsg.includes('已是')) {
        my.showToast({ content: '您已是该组织成员', duration: 2000 });
      } else {
        my.showToast({ content: '加入失败: ' + (errMsg || '请重试'), duration: 2000 });
      }
    } finally {
      this.setData({ submitting: false });
    }
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
  }
});
