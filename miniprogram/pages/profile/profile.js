// 个人中心页
Page({
  data: {
    userInfo: {},
    orgInfo: {},
    stats: {
      initiated: 0,
      approved: 0,
      completed: 0
    }
  },

  onShow() {
    this.loadUserData();
  },

  loadUserData() {
    const app = getApp();
    const userInfo = app.getUserInfo();
    
    // TODO: 从后端加载完整用户数据
    this.setData({
      userInfo: userInfo || { name: '张宝宇', department: '技术部' },
      orgInfo: { name: '留痕备案组织', memberCount: 25 },
      stats: {
        initiated: 12,
        approved: 8,
        completed: 35
      }
    });
  },

  viewOrg() {
    my.showToast({
      content: '组织详情开发中...',
      duration: 1500
    });
  },

  joinOrg() {
    my.showModal({
      title: '加入组织',
      content: '请输入组织邀请码或通过链接加入',
      editable: true,
      placeholderText: '邀请码',
      success: (res) => {
        if (res.confirm && res.text) {
          // TODO: 调用后端 API 加入组织
          my.showSuccess({ content: '加入成功' });
        }
      }
    });
  },

  showAbout() {
    my.showModal({
      title: '关于留痕备案',
      content: '留痕备案 v1.0.0\n\n企业级安全合规备案系统\n符合网信安全要求和国家等保规定\n\n© 2026 All Rights Reserved',
      showCancel: false
    });
  },

  showHelp() {
    my.navigateTo({
      url: '/pages/help/help'
    });
  },

  contactSupport() {
    my.showModal({
      title: '联系支持',
      content: '如有技术问题，请联系:\n\n邮箱：support@example.com\n电话：400-XXX-XXXX',
      showCancel: false
    });
  },

  logout() {
    my.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          my.removeStorageSync({ key: 'userInfo' });
          
          // 重置数据
          this.setData({
            userInfo: {},
            orgInfo: {}
          });
          
          my.showSuccess({ content: '已退出登录' });
        }
      }
    });
  }
});
