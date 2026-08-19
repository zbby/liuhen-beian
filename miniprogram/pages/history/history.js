// 历史记录页
Page({
  data: {
    filterType: 'all',
    historyList: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      // 模拟数据
      const allHistory = [
        {
          id: 101,
          title: 'Q1 安全审计报告备案',
          description: '2026 年第一季度信息安全审计报告归档',
          creator: '安全部 - 王五',
          completeTime: '2026-04-15',
          status: 'completed',
          statusText: '已完成',
          categoryColor: '#52c41a'
        },
        {
          id: 102,
          title: '防火墙策略变更',
          description: '调整生产环境防火墙规则，开放必要端口',
          creator: '运维部 - 赵六',
          completeTime: '2026-04-10',
          status: 'completed',
          statusText: '已完成',
          categoryColor: '#1890FF'
        },
        {
          id: 103,
          title: '测试环境部署申请',
          description: '新版本测试环境部署',
          creator: '开发部 - 钱七',
          completeTime: '2026-04-05',
          status: 'rejected',
          statusText: '已驳回',
          categoryColor: '#f5222d'
        }
      ];
      
      // 根据筛选类型过滤
      let filteredList = allHistory;
      if (this.data.filterType === 'completed') {
        filteredList = allHistory.filter(item => item.status === 'completed');
      } else if (this.data.filterType === 'rejected') {
        filteredList = allHistory.filter(item => item.status === 'rejected');
      }
      
      this.setData({
        historyList: filteredList
      });
    } catch (error) {
      console.error('加载失败:', error);
    }
  },

  setFilter(e) {
    const filterType = e.currentTarget.dataset.type;
    this.setData({ filterType });
    this.loadData();
  },

  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({
      url: `/pages/detail/detail?id=${eventId}`
    });
  }
});
