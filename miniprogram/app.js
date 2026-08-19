// 留痕备案 - 钉钉小程序
App({
  globalData: {
    // 应用配置
    appId: 'b678a385-0fc0-4688-8810-e7ef343afd2a',
    agentId: '4598010509',
    
    // 后端 API 地址
    apiBaseUrl: 'http://8.147.61.234:3000/api',
    
    // 用户信息 (模拟登录用户)
    userInfo: {
      userId: 'admin001',
      name: '张宝宇',
      department: '技术部',
      phone: '138****1234'
    },
    
    // 组织信息
    orgInfo: {
      id: 1,
      name: '留痕备案组织',
      memberCount: 25
    },
    
    // 审批模式选项
    approvalModes: [
      { value: 'countersign', label: '会签 (所有人都需同意)' },
      { value: 'orSign', label: '或签 (一人同意即可)' },
      { value: 'notifyOnly', label: '仅通知 (无需审批)' }
    ],
    
    // 审批人模板
    approvalTemplates: [
      { id: 1, name: '直属主管', type: 'auto', role: 'manager' },
      { id: 2, name: '部门负责人', type: 'auto', role: 'dept_head' },
      { id: 3, name: '安全管理员', type: 'auto', role: 'security_admin' },
      { id: 4, name: '自定义人员', type: 'manual', users: [] }
    ],
    
    // 事件分类关键词 (用于自动分类)
    eventCategories: [
      { id: 'security', name: '安全事件', keywords: ['安全', '攻击', '漏洞', '入侵', '异常登录'] },
      { id: 'operation', name: '操作记录', keywords: ['操作', '变更', '配置', '部署', '上线'] },
      { id: 'compliance', name: '合规备案', keywords: ['合规', '审计', '备案', '检查', '报告'] },
      { id: 'incident', name: '事故记录', keywords: ['事故', '故障', '中断', '恢复', '应急'] },
      { id: 'other', name: '其他', keywords: [] }
    ]
  },

  onLaunch() {
    console.log('留痕备案小程序启动');
    // 初始化登录状态
    this.checkLogin();
  },

  // 检查登录状态
  checkLogin() {
    const userInfo = my.getStorageSync({ key: 'userInfo' });
    if (userInfo && userInfo.data) {
      this.globalData.userInfo = userInfo.data;
    }
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // API 请求封装
  request(options) {
    const { url, method = 'GET', data } = options;
    
    return new Promise((resolve, reject) => {
      my.request({
        url: this.globalData.apiBaseUrl + url,
        method,
        data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.userInfo ? `Bearer ${this.globalData.userInfo.token}` : ''
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 0) {
            resolve(res.data.data);
          } else {
            reject(res.data);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
});
