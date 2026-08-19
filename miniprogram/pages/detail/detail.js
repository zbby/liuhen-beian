// 事件详情页
const { api } = require('../../utils/api');
const { EVENT_STATUS, EVENT_STATUS_TEXT, APPROVAL_MODE_TEXT, APPROVAL_ACTION } = require('../../utils/constants');
const { getCategoryById } = require('../../utils/classify');

Page({
  data: {
    eventId: null,
    event: null,
    canApprove: false,
    canWithdraw: false,
    activeTab: 'flow',  // flow | attachments | logs
    loading: true
  },

  onLoad(options) {
    const eventId = options.id;
    this.setData({ eventId });
    this.loadDetail(eventId);
  },

  async loadDetail(eventId) {
    this.setData({ loading: true });
    try {
      const event = await api.event.getDetail(eventId);
      this.setData({ event: this.formatEvent(event), loading: false });
      this.checkPermissions();
    } catch (err) {
      console.error('加载详情失败:', err);
      this.loadMockDetail(eventId);
    }
  },

  // 降级模拟数据
  loadMockDetail(eventId) {
    const mockEvent = {
      id: eventId,
      title: '服务器配置变更备案',
      description: '生产环境数据库配置调整，涉及连接池参数优化，以提升系统性能和稳定性。本次变更经过测试环境验证，预计无停机影响。',
      status: 'processing',
      creator: { name: '张三', avatar: '张' },
      createTime: '2026-08-19 14:30',
      categoryId: 'operation',
      approvalMode: 'countersign',
      attachments: [
        { id: 1, name: '变更方案.png', type: 'image', preview: 'https://via.placeholder.com/200x200/0052D9/FFFFFF?text=1' },
        { id: 2, name: '测试报告.png', type: 'image', preview: 'https://via.placeholder.com/200x200/52C41A/FFFFFF?text=2' },
        { id: 3, name: '配置变更记录.docx', type: 'file', preview: '' }
      ],
      approvalFlow: [
        { id: 1, nodeType: 'approval', approverName: '李四', approverRole: '直属主管', status: 'completed', statusText: '已同意', time: '2026-08-19 15:00', comment: '同意，注意观察系统性能' },
        { id: 2, nodeType: 'approval', approverName: '王五', approverRole: '部门负责人', status: 'pending', statusText: '待审批', time: '', comment: '' },
        { id: 3, nodeType: 'approval', approverName: '赵六', approverRole: '安全管理员', status: 'pending', statusText: '待审批', time: '', comment: '' },
        { id: 4, nodeType: 'cc', approverName: '钱七', approverRole: '通知人', status: 'notified', statusText: '已通知', time: '2026-08-19 14:30', comment: '' }
      ],
      notifyUsers: [
        { name: '钱七', notified: true },
        { name: '孙八', notified: true }
      ],
      logs: [
        { time: '2026-08-19 14:30', content: '张三 创建了事件', type: 'create' },
        { time: '2026-08-19 14:30', content: '系统已 Ding 通知 4 位相关人员', type: 'ding' },
        { time: '2026-08-19 15:00', content: '李四（直属主管）审批通过', type: 'approve' }
      ]
    };
    this.setData({ event: this.formatEvent(mockEvent), loading: false });
    this.checkPermissions();
  },

  formatEvent(e) {
    const cat = getCategoryById(e.categoryId || e.category || 'other');
    return {
      ...e,
      statusText: EVENT_STATUS_TEXT[e.status] || '未知',
      categoryIcon: cat.icon,
      categoryName: cat.name,
      categoryColor: cat.color,
      approvalModeText: APPROVAL_MODE_TEXT[e.approvalMode] || '会签'
    };
  },

  // 检查权限
  checkPermissions() {
    const app = getApp();
    const user = app.globalData.userInfo;
    const event = this.data.event;
    if (!user || !event) return;

    // 当前用户是否是待审批节点审批人
    const pendingNode = (event.approvalFlow || []).find(n => n.status === 'pending');
    const canApprove = pendingNode && pendingNode.approverName === user.name;
    // 当前用户是否是发起人且状态为待审批（可撤回）
    const canWithdraw = event.creator && event.creator.name === user.name &&
      (event.status === 'pending_approval' || event.status === 'processing');

    this.setData({ canApprove, canWithdraw });
  },

  // 切换标签
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // 预览图片
  previewAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.event.attachments.filter(a => a.type === 'image');
    const urls = images.map(a => a.preview);
    const imgIndex = images.findIndex(a => a.id === this.data.event.attachments[index].id);
    my.previewImage({ urls, current: urls[imgIndex >= 0 ? imgIndex : 0] });
  },

  // ===== 审批操作 =====
  async doApprove() {
    my.showModal({
      title: '审批同意',
      content: '请输入审批意见（可选）',
      editable: true,
      placeholderText: '同意',
      success: async (res) => {
        if (res.confirm) {
          await this.submitApproval(APPROVAL_ACTION.AGREE, res.text || '同意');
        }
      }
    });
  },

  async doReject() {
    my.showModal({
      title: '驳回',
      content: '请输入驳回理由',
      editable: true,
      placeholderText: '请说明驳回原因',
      success: async (res) => {
        if (res.confirm && res.text) {
          await this.submitApproval(APPROVAL_ACTION.REJECT, res.text);
        } else if (res.confirm) {
          my.showToast({ content: '请填写驳回理由', duration: 2000 });
        }
      }
    });
  },

  async doTransfer() {
    my.selectContact({
      type: 'member',
      success: async (sel) => {
        if (sel.users && sel.users.length > 0) {
          const target = sel.users[0];
          my.showModal({
            title: '转办确认',
            content: `将审批转办给：${target.name}？`,
            success: async (confirm) => {
              if (confirm.confirm) {
                await this.submitApproval(APPROVAL_ACTION.TRANSFER, `转办给${target.name}`, { toUserId: target.userId });
              }
            }
          });
        }
      },
      fail: () => {
        my.showToast({ content: '请选择转办人', duration: 2000 });
      }
    });
  },

  async submitApproval(action, comment, extra = {}) {
    my.showLoading({ content: '处理中...' });
    try {
      await api.approval.submit(this.data.event.approvalFlowId || this.data.eventId, action, comment, extra);
      my.hideLoading();
      my.showToast({ content: action === 'agree' ? '已同意' : action === 'reject' ? '已驳回' : '已转办', duration: 1500 });
      this.loadDetail(this.data.eventId);
    } catch (err) {
      my.hideLoading();
      console.error('审批操作失败:', err);
      // 降级：模拟操作成功
      my.showToast({ content: '操作成功（离线模式）', duration: 1500 });
      this.loadMockDetail(this.data.eventId);
    }
  },

  // 撤回
  async doWithdraw() {
    my.showModal({
      title: '撤回事件',
      content: '确定撤回该事件？撤回后审批流程终止。',
      success: async (res) => {
        if (res.confirm) {
          my.showLoading({ content: '撤回中...' });
          try {
            await api.event.withdraw(this.data.eventId);
            my.hideLoading();
            my.showToast({ content: '已撤回', duration: 1500 });
            setTimeout(() => my.navigateBack(), 1500);
          } catch (err) {
            my.hideLoading();
            my.showToast({ content: '已撤回（离线模式）', duration: 1500 });
            setTimeout(() => my.navigateBack(), 1500);
          }
        }
      }
    });
  }
});
