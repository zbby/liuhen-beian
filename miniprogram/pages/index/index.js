// 首页
const { api } = require('../../utils/api');
const { ensureLogin, checkOrg } = require('../../utils/auth');
const { EVENT_STATUS, EVENT_STATUS_TEXT } = require('../../utils/constants');
const { getCategoryById } = require('../../utils/classify');

Page({
  data: {
    // 组织与用户
    userName: '',
    orgName: '',
    hasOrg: false,
    // 统计
    pendingCount: 0,
    approvalCount: 0,
    completedCount: 0,
    // 列表
    eventList: [],
    refreshing: false
  },

  async onLoad() {
    await this.initPage();
  },

  async onShow() {
    // 每次显示刷新数据
    if (this.data.hasOrg) {
      this.loadData();
    } else {
      await this.initPage();
    }
  },

  // 初始化：检查登录 + 组织
  async initPage() {
    try {
      await ensureLogin();
      const app = getApp();
      const org = await checkOrg();

      this.setData({
        userName: app.globalData.userInfo ? app.globalData.userInfo.name : '用户',
        orgName: org ? org.name : '',
        hasOrg: !!org
      });

      if (org) {
        this.loadData();
      }
    } catch (e) {
      console.error('首页初始化失败:', e);
    }
  },

  // 加载事件数据
  async loadData() {
    this.setData({ refreshing: false });
    try {
      const [pending, approvals, completed] = await Promise.all([
        api.event.getMyEvents(1, 5).catch(() => this.mockEvents('pending')),
        api.event.getPendingApprovals(1, 5).catch(() => this.mockEvents('approval')),
        api.event.getHistory({ page: 1, size: 1 }).catch(() => ({ total: 0 }))
      ]);

      const eventList = (pending.list || pending || []).map(e => this.formatEvent(e));

      this.setData({
        pendingCount: pending.total || eventList.length,
        approvalCount: approvals.total || (approvals.list || []).length,
        completedCount: completed.total || 0,
        eventList
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      this.loadMockData();
    }
  },

  // 降级模拟数据
  loadMockData() {
    const mockList = [
      { id: 1, title: '服务器配置变更备案', description: '生产环境数据库配置调整，涉及连接池参数优化', createTime: '2026-08-19 14:30', status: 'processing', categoryId: 'operation' },
      { id: 2, title: '安全漏洞修复记录', description: '修复 Log4j 漏洞，升级至最新版本', createTime: '2026-08-19 10:15', status: 'pending_approval', categoryId: 'security' },
      { id: 3, title: '甲供材入库 - 光缆到货', description: 'G.652D 光缆 48 芯，12 公里到货入库', createTime: '2026-08-18 16:45', status: 'processing', categoryId: 'material_in' },
      { id: 4, title: '系统上线备案', description: '新版本营销系统正式上线', createTime: '2026-08-17 09:00', status: 'pending_approval', categoryId: 'operation' }
    ].map(e => this.formatEvent(e));

    this.setData({
      pendingCount: 4,
      approvalCount: 2,
      completedCount: 15,
      eventList: mockList
    });
  },

  mockEvents(type) {
    return { list: [], total: 0 };
  },

  // 格式化事件
  formatEvent(e) {
    const cat = getCategoryById(e.categoryId || e.category || 'other');
    return {
      ...e,
      statusText: EVENT_STATUS_TEXT[e.status] || e.statusText || '未知',
      categoryIcon: cat.icon,
      categoryName: cat.name,
      categoryColor: cat.color
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      my.stopPullDownRefresh();
    });
  },

  // 跳转到发起页面
  goToCreate() {
    my.switchTab({ url: '/pages/create/create' });
  },

  // 跳转到审批
  goToApproval() {
    my.switchTab({ url: '/pages/approval/approval' });
  },

  // 跳转到历史
  goToHistory() {
    my.switchTab({ url: '/pages/history/history' });
  },

  // 跳转到甲供材
  goToMaterial() {
    my.navigateTo({ url: '/pages/material/material' });
  },

  // 跳转到事件详情
  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({ url: `/pages/detail/detail?id=${eventId}` });
  },

  // 前往加入组织
  goToOrgJoin() {
    my.navigateTo({ url: '/pages/org-join/org-join' });
  }
});
