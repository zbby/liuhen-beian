// 审批列表页
const { api } = require('../../utils/api');
const { EVENT_STATUS_TEXT, APPROVAL_MODE_TEXT } = require('../../utils/constants');
const { getCategoryById } = require('../../utils/classify');

Page({
  data: {
    filterType: 'pending',  // pending | done
    approvalList: [],
    loading: true
  },

  onShow() {
    this.loadData();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      my.stopPullDownRefresh();
    });
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const list = await api.approval.getPending(1, 50);
      this.setData({
        approvalList: (list.list || []).map(e => this.formatEvent(e)),
        loading: false
      });
    } catch (err) {
      console.error('加载审批列表失败:', err);
      this.loadMockData();
    }
  },

  loadMockData() {
    const mockList = [
      { id: 1, title: '服务器配置变更备案', description: '生产环境数据库配置调整，涉及连接池参数优化', creator: { name: '张三' }, createTime: '2026-08-19 14:30', status: 'processing', approvalMode: 'countersign', categoryId: 'operation', currentApprover: '王五' },
      { id: 2, title: '安全漏洞修复记录', description: '修复 Log4j 漏洞，升级至最新版本', creator: { name: '李四' }, createTime: '2026-08-19 10:15', status: 'pending_approval', approvalMode: 'orSign', categoryId: 'security', currentApprover: '赵六' },
      { id: 3, title: '甲供材出库申请 - 光缆', description: '48 芯 G.652D 光缆 5 公里出库至岫岩项目', creator: { name: '钱七' }, createTime: '2026-08-18 16:00', status: 'pending_approval', approvalMode: 'countersign', categoryId: 'material_out', currentApprover: '孙八' }
    ].map(e => this.formatEvent(e));
    this.setData({ approvalList: mockList, loading: false });
  },

  formatEvent(e) {
    const cat = getCategoryById(e.categoryId || 'other');
    return {
      ...e,
      statusText: EVENT_STATUS_TEXT[e.status] || '待审批',
      categoryIcon: cat.icon,
      categoryName: cat.name,
      categoryColor: cat.color,
      approvalModeText: APPROVAL_MODE_TEXT[e.approvalMode] || '会签'
    };
  },

  setFilter(e) {
    this.setData({ filterType: e.currentTarget.dataset.type });
    this.loadData();
  },

  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({ url: `/pages/detail/detail?id=${eventId}` });
  }
});
