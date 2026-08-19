// 历史记录页
const { api } = require('../../utils/api');
const { EVENT_STATUS, EVENT_STATUS_TEXT } = require('../../utils/constants');
const { getCategoryById, getAllCategories } = require('../../utils/classify');

Page({
  data: {
    filterType: 'all',
    filterCategory: 'all',
    searchKeyword: '',
    historyList: [],
    categories: [],
    loading: true
  },

  onLoad(options) {
    // 从首页传入的筛选参数
    if (options.filter) {
      this.setData({ filterType: options.filter });
    }
    this.setData({ categories: getAllCategories() });
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => my.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const params = {
        status: this.data.filterType === 'all' ? null : this.data.filterType,
        category: this.data.filterCategory === 'all' ? null : this.data.filterCategory,
        keyword: this.data.searchKeyword || null,
        page: 1,
        size: 50
      };
      const result = await api.event.getHistory(params);
      const list = (result.list || []).map(e => this.formatEvent(e));
      this.setData({ historyList: list, loading: false });
    } catch (err) {
      console.error('加载历史失败:', err);
      this.loadMockData();
    }
  },

  loadMockData() {
    const allData = [
      { id: 101, title: 'Q1 安全审计报告备案', description: '2026 年第一季度信息安全审计报告归档', creator: { name: '安全部-王五' }, completeTime: '2026-04-15', status: 'archived', categoryId: 'compliance' },
      { id: 102, title: '防火墙策略变更', description: '调整生产环境防火墙规则，开放必要端口', creator: { name: '运维部-赵六' }, completeTime: '2026-04-10', status: 'completed', categoryId: 'operation' },
      { id: 103, title: '甲供材入库 - 光缆到货', description: 'G.652D 光缆 48 芯 12 公里到货入库', creator: { name: '物资部-钱七' }, completeTime: '2026-04-05', status: 'completed', categoryId: 'material_in' },
      { id: 104, title: '测试环境部署申请', description: '新版本测试环境部署', creator: { name: '开发部-孙八' }, completeTime: '2026-03-28', status: 'rejected', categoryId: 'operation' },
      { id: 105, title: '甲供材转借 - OLT 设备', description: 'OLT 设备从鞍山项目转借至岫岩项目', creator: { name: '工程部-周九' }, completeTime: '2026-03-20', status: 'archived', categoryId: 'material_borrow' }
    ];
    let filtered = allData;
    if (this.data.filterType !== 'all') {
      filtered = filtered.filter(i => i.status === this.data.filterType);
    }
    if (this.data.filterCategory !== 'all') {
      filtered = filtered.filter(i => i.categoryId === this.data.filterCategory);
    }
    if (this.data.searchKeyword) {
      const kw = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(kw) || i.description.toLowerCase().includes(kw)
      );
    }
    this.setData({ historyList: filtered.map(e => this.formatEvent(e)), loading: false });
  },

  formatEvent(e) {
    const cat = getCategoryById(e.categoryId || 'other');
    return {
      ...e,
      statusText: EVENT_STATUS_TEXT[e.status] || '已完成',
      categoryIcon: cat.icon,
      categoryName: cat.name,
      categoryColor: cat.color
    };
  },

  setFilter(e) {
    this.setData({ filterType: e.currentTarget.dataset.type });
    this.loadData();
  },

  setCategoryFilter(e) {
    this.setData({ filterCategory: e.currentTarget.dataset.cat });
    this.loadData();
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch() {
    this.loadData();
  },

  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({ url: `/pages/detail/detail?id=${eventId}` });
  }
});
