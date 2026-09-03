// 留痕报备 - 钉钉小程序
// 基于钉钉小程序云 Serverless 架构

const { initCloud } = require('./utils/api');

App({
  globalData: {
    // ===== 钉钉应用配置 =====
    appId: '765fe4e3-301a-4238-8951-f24d740e9989',
    agentId: '4938869267',

    // ===== 后端模式 =====
    // 'http' = 传统 HTTP 后端（部署在 ECS 8.147.61.234:3000）
    backendMode: 'http',
    apiBaseUrl: 'https://zhangbaoyu.site/api',

    // ===== 用户与组织信息（免登后填充）=====
    userInfo: null,       // { userId, name, avatar, phone, deptId, deptName }
    orgInfo: null,        // { id, name, role, memberCount }
    isLoggedIn: false,
    hasOrg: false,

    // ===== 事件状态枚举 =====
    eventStatus: {
      DRAFT: 'draft',
      PENDING_APPROVAL: 'pending_approval',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      REJECTED: 'rejected',
      ARCHIVED: 'archived',
      WITHDRAWN: 'withdrawn'
    },

    // ===== 审批模式 =====
    approvalModes: [
      { value: 'countersign', label: '会签', desc: '所有审批人均需同意' },
      { value: 'orSign', label: '或签', desc: '任一审批人同意即可' },
      { value: 'notifyOnly', label: '仅知会', desc: '仅通知，无需审批' }
    ],

    // ===== 审批节点类型 =====
    nodeTypes: {
      APPROVAL: 'approval',    // 审批节点
      CC: 'cc',                // 抄送/知会节点
      WITNESS: 'witness',      // 见证节点
      ACTION: 'action'         // 执行节点（如甲供材出入库）
    },

    // ===== 审批人指派规则 =====
    assignRules: {
      MANUAL: 'manual',        // 手动指定
      PRESET: 'preset',        // 预设模板
      AUTO: 'auto',            // 自动指派（如直属主管）
      RULE: 'rule'             // 规则指派（如按金额、类型）
    },

    // ===== 审批模板（待选）=====
    approvalTemplates: [
      {
        id: 'tpl_001',
        name: '直属主管审批',
        type: 'preset',
        nodes: [
          { nodeType: 'approval', assignRule: 'auto', role: 'direct_manager', mode: 'countersign' }
        ]
      },
      {
        id: 'tpl_002',
        name: '主管 + 部门负责人',
        type: 'preset',
        nodes: [
          { nodeType: 'approval', assignRule: 'auto', role: 'direct_manager', mode: 'countersign' },
          { nodeType: 'approval', assignRule: 'auto', role: 'dept_head', mode: 'countersign' }
        ]
      },
      {
        id: 'tpl_003',
        name: '主管 + 安全员会签',
        type: 'preset',
        nodes: [
          { nodeType: 'approval', assignRule: 'auto', role: 'direct_manager', mode: 'countersign' },
          { nodeType: 'approval', assignRule: 'auto', role: 'security_admin', mode: 'countersign' },
          { nodeType: 'cc', assignRule: 'manual', mode: 'notifyOnly' }
        ]
      },
      {
        id: 'tpl_004',
        name: '三级审批（主管→部门→分管领导）',
        type: 'preset',
        nodes: [
          { nodeType: 'approval', assignRule: 'auto', role: 'direct_manager', mode: 'countersign' },
          { nodeType: 'approval', assignRule: 'auto', role: 'dept_head', mode: 'countersign' },
          { nodeType: 'approval', assignRule: 'auto', role: 'vp', mode: 'countersign' }
        ]
      },
      {
        id: 'tpl_005',
        name: '仅通知（不需审批）',
        type: 'preset',
        nodes: [
          { nodeType: 'cc', assignRule: 'manual', mode: 'notifyOnly' }
        ]
      },
      {
        id: 'tpl_custom',
        name: '自定义审批人',
        type: 'manual',
        nodes: []
      }
    ],

    // ===== 事件分类（自动分类用）=====
    eventCategories: [
      { id: 'security', name: '安全事件', icon: '🔒', color: '#f5222d', keywords: ['安全', '攻击', '漏洞', '入侵', '异常登录', '勒索', '病毒', '防火墙'] },
      { id: 'operation', name: '操作记录', icon: '⚙', color: '#1890FF', keywords: ['操作', '变更', '配置', '部署', '上线', '维护', '割接', '升级'] },
      { id: 'compliance', name: '合规备案', icon: '📋', color: '#722ed1', keywords: ['合规', '审计', '备案', '检查', '报告', '等保', '验收'] },
      { id: 'incident', name: '故障记录', icon: '⚠', color: '#fa8c16', keywords: ['故障', '中断', '恢复', '应急', '告警', '宕机', '业务中断'] },
      { id: 'material_in', name: '甲供材入库', icon: '📦', color: '#52c41a', keywords: ['入库', '到货', '接收', '采购', '甲供'] },
      { id: 'material_out', name: '甲供材出库', icon: '📤', color: '#13c2c2', keywords: ['出库', '领用', '发放', '配送', '分发'] },
      { id: 'material_borrow', name: '甲供材转借', icon: '🔄', color: '#eb2f96', keywords: ['转借', '借用', '调拨', '跨项目'] },
      { id: 'material_return', name: '甲供材归还', icon: '↩', color: '#a0d911', keywords: ['归还', '退还', '退库', '回收'] },
      { id: 'meeting', name: '会议纪要', icon: '📝', color: '#2f54eb', keywords: ['会议', '纪要', '讨论', '决议', '会商'] },
      { id: 'other', name: '其他', icon: '📄', color: '#8c8c8c', keywords: [] }
    ],

    // ===== DING 通知窗口 =====
    dingWindow: { start: 8, end: 22 },

    //===== 附件限制 =====
    attachmentLimits: {
      maxCount: 20,
      maxSizePerFile: 200, // MB
      maxTotalSize: 1024,  // MB (1GB)
      allowedTypes: ['image', 'audio', 'video', 'file']
    }
  },

  onLaunch() {
    console.log('[留痕报备] 小程序启动');
    // 初始化钉钉小程序云
    if (this.globalData.backendMode === 'cloud') {
      initCloud();
    }
    // 尝试恢复登录态
    this.restoreLogin();
  },

  onShow() {
    console.log('[留痕报备] 小程序进入前台');
  },

  onHide() {
    console.log('[留痕报备] 小程序进入后台');
  },

  // ===== 恢复缓存的登录信息 =====
  restoreLogin() {
    try {
      const cached = my.getStorageSync({ key: 'userInfo' });
      if (cached && cached.data) {
        this.globalData.userInfo = cached.data;
        this.globalData.isLoggedIn = true;
      }
      const cachedOrg = my.getStorageSync({ key: 'orgInfo' });
      if (cachedOrg && cachedOrg.data) {
        this.globalData.orgInfo = cachedOrg.data;
        this.globalData.hasOrg = true;
      }
    } catch (e) {
      console.error('恢复登录信息失败:', e);
    }
  },

  // ===== 保存登录信息 =====
  saveUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    my.setStorageSync({
      key: 'userInfo',
      data: userInfo
    });
  },

  // ===== 保存组织信息 =====
  saveOrgInfo(orgInfo) {
    this.globalData.orgInfo = orgInfo;
    this.globalData.hasOrg = true;
    my.setStorageSync({
      key: 'orgInfo',
      data: orgInfo
    });
  },

  // ===== 退出登录 =====
  logout() {
    this.globalData.userInfo = null;
    this.globalData.orgInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.hasOrg = false;
    try {
      my.removeStorageSync({ key: 'userInfo' });
      my.removeStorageSync({ key: 'orgInfo' });
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }
});
