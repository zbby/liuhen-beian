// 审批节点详情（加签/转办的辅助页面）
Page({
  data: {
    flowId: null,
    node: null
  },
  onLoad(options) {
    this.setData({ flowId: options.flowId });
    // 模拟数据
    this.setData({
      node: {
        approverName: '王五',
        approverRole: '部门负责人',
        status: 'pending',
        statusText: '待审批',
        time: '',
        comment: ''
      }
    });
  }
});
