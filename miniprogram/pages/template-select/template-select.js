// 审批模板选择
Page({
  data: {
    templates: [],
    selectedId: null
  },

  onLoad() {
    const app = getApp();
    this.setData({ templates: app.globalData.approvalTemplates });
  },

  selectTemplate(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedId: id });

    const tpl = this.data.templates.find(t => t.id === id);
    my.showModal({
      title: '模板详情',
      content: `名称：${tpl.name}\n类型：${tpl.type === 'preset' ? '预设模板' : '自定义'}\n节点数：${tpl.nodes ? tpl.nodes.length : 0}\n\n${tpl.nodes ? tpl.nodes.map((n, i) => `${i+1}. ${n.nodeType === 'approval' ? '审批' : n.nodeType === 'cc' ? '知会' : ''} - ${n.assignRule === 'auto' ? '自动指派' : '手动指定'}`).join('\n') : '自定义审批人，发起时选择'}`,
      confirmText: '使用此模板',
      success: (res) => {
        if (res.confirm) {
          const pages = my.getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.selectTemplate) {
            // 回传选中的模板ID
          }
          my.navigateBack();
        }
      }
    });
  }
});
