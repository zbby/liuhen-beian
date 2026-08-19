// 甲供材流转仪表盘
const { api } = require('../../utils/api');

Page({
  data: {
    stats: {
      inStock: 0,
      outStock: 0,
      borrowed: 0,
      totalValue: 0
    },
    recentLogs: [],
    menuItems: [
      { id: 'material-in', icon: '📦', name: '入库登记', desc: '到货接收、入库验收', color: '#52C41A' },
      { id: 'material-out', icon: '📤', name: '出库领用', desc: '出库发放至项目', color: '#13C2C2' },
      { id: 'material-borrow', icon: '🔄', name: '转借调拨', desc: '跨项目转借', color: '#EB2F96' },
      { id: 'material-return', icon: '↩', name: '归还退库', desc: '归还或退库', color: '#A0D911' }
    ]
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const dashboard = await api.material.getDashboard(getApp().globalData.orgInfo?.org_id || getApp().globalData.userInfo?.org_id);
      this.setData({ stats: dashboard.stats, recentLogs: dashboard.recentLogs });
    } catch (err) {
      console.error('加载仪表盘失败:', err);
      this.loadMock();
    }
  },

  loadMock() {
    this.setData({
      stats: {
        inStock: 156,
        outStock: 89,
        borrowed: 12,
        totalValue: 328600
      },
      recentLogs: [
        { id: 1, type: 'material_in', title: '光缆到货入库', person: '钱七', time: '2026-08-19 10:00', status: 'completed' },
        { id: 2, type: 'material_out', title: 'OLT 设备出库至岫岩项目', person: '孙八', time: '2026-08-18 15:30', status: 'completed' },
        { id: 3, type: 'material_borrow', title: 'OTDR 仪转借至海城项目', person: '周九', time: '2026-08-17 09:15', status: 'processing' }
      ]
    });
  },

  goToSubPage(e) {
    const pageId = e.currentTarget.dataset.id;
    my.navigateTo({ url: `/pages/material/${pageId}` });
  },

  goToDetail(e) {
    const logId = e.currentTarget.dataset.id;
    my.navigateTo({ url: `/pages/detail/detail?id=${logId}` });
  }
});
