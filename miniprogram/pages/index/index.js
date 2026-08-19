// 首页
Page({
  data: {
    pendingCount: 0,
    approvalCount: 0,
    completedCount: 0,
    eventList: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadData();
  },

  // 加载数据
  async loadData() {
    try {
      // TODO: 调用后端 API 获取数据
      // 暂时使用模拟数据
      this.setData({
        pendingCount: 3,
        approvalCount: 2,
        completedCount: 15,
        eventList: [
          {
            id: 1,
            title: '服务器配置变更备案',
            description: '生产环境数据库配置调整，涉及连接池参数优化',
            createTime: '2026-05-20 14:30',
            status: 'processing',
            statusText: '审批中',
            categoryColor: '#1890FF'
          },
          {
            id: 2,
            title: '安全漏洞修复记录',
            description: '修复 Log4j 漏洞，升级至最新版本',
            createTime: '2026-05-20 10:15',
            status: 'pending',
            statusText: '待处理',
            categoryColor: '#52c41a'
          },
          {
            id: 3,
            title: '系统上线备案',
            description: '新版本营销系统正式上线',
            createTime: '2026-05-19 16:45',
            status: 'processing',
            statusText: '审批中',
            categoryColor: '#fa8c16'
          }
        ]
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      my.showToast({
        content: '加载失败，请重试',
        duration: 2000
      });
    }
  },

  // 跳转到发起页面
  goToCreate() {
    my.navigateTo({
      url: '/pages/create/create'
    });
  },

  // 跳转到审批页面
  goToApproval() {
    my.navigateTo({
      url: '/pages/approval/approval'
    });
  },

  // 跳转到历史页面
  goToHistory() {
    my.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 跳转到事件详情
  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({
      url: `/pages/detail/detail?id=${eventId}`
    });
  },

  // 查看全部
  viewAll() {
    my.navigateTo({
      url: '/pages/history/history?filter=processing'
    });
  }
});
