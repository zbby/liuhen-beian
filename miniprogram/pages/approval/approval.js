// 审批列表页
Page({
  data: {
    approvalList: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      // TODO: 调用后端 API
      // 模拟数据
      this.setData({
        approvalList: [
          {
            id: 1,
            title: '服务器配置变更备案',
            description: '生产环境数据库配置调整，涉及连接池参数优化',
            creator: '张三',
            createTime: '2026-05-20 14:30',
            approvalModeText: '会签',
            categoryColor: '#1890FF'
          },
          {
            id: 2,
            title: '安全漏洞修复记录',
            description: '修复 Log4j 漏洞，升级至最新版本',
            creator: '李四',
            createTime: '2026-05-20 10:15',
            approvalModeText: '或签',
            categoryColor: '#52c41a'
          }
        ]
      });
    } catch (error) {
      console.error('加载失败:', error);
    }
  },

  goToDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    my.navigateTo({
      url: `/pages/detail/detail?id=${eventId}`
    });
  }
});
