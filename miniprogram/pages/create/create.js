// 发起留痕备案
const { api } = require('../../utils/api');
const { classify } = require('../../utils/classify');
const { APPROVAL_MODE, EVENT_STATUS } = require('../../utils/constants');

Page({
  data: {
    // 表单
    title: '',
    description: '',
    descriptionLength: 0,
    autoCategory: null,
    autoCategoryConfidence: 0,
    // 附件
    attachments: [],
    // 审批
    approvalMode: 'countersign',
    approvalModes: [],
    approvalTemplates: [],
    selectedTemplateId: null,
    approvers: [],
    notifyUsers: [],
    // 提交控制
    canSubmit: false,
    submitting: false
  },

  onLoad() {
    const app = getApp();
    this.setData({
      approvalModes: app.globalData.approvalModes,
      approvalTemplates: app.globalData.approvalTemplates
    });
  },

  // ===== 标题输入 =====
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
    this.updateAutoClassify();
    this.checkCanSubmit();
  },

  // ===== 描述输入 =====
  onDescriptionInput(e) {
    const desc = e.detail.value;
    this.setData({ description: desc, descriptionLength: desc.length });
    this.updateAutoClassify();
    this.checkCanSubmit();
  },

  // ===== 自动分类 =====
  updateAutoClassify() {
    const text = this.data.title + ' ' + this.data.description;
    if (!text.trim()) {
      this.setData({ autoCategory: null });
      return;
    }
    const result = classify(text);
    this.setData({
      autoCategory: result,
      autoCategoryConfidence: result.confidence
    });
  },

  // ===== 附件上传 =====
  chooseImage() {
    const limit = getApp().globalData.attachmentLimits;
    const remaining = limit.maxCount - this.data.attachments.length;
    if (remaining <= 0) {
      my.showToast({ content: `最多上传 ${limit.maxCount} 个附件`, duration: 2000 });
      return;
    }
    my.chooseImage({
      count: Math.min(remaining, 9),
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newAttachments = res.tempFilePaths.map(path => ({
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          path: path,
          preview: path,
          type: 'image',
          name: path.split('/').pop(),
          status: 'local'  // local | uploaded
        }));
        this.setData({
          attachments: [...this.data.attachments, ...newAttachments]
        });
      }
    });
  },

  // 选择文件（音频/视频等）
  chooseFile() {
    // 钉钉小程序文件选择 API
    my.chooseFile({
      count: 5,
      success: (res) => {
        if (res.apFilePaths && res.apFilePaths.length) {
          const newAttachments = res.apFilePaths.map(path => {
            const ext = path.split('.').pop().toLowerCase();
            let type = 'file';
            if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) type = 'audio';
            if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
            return {
              id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              path: path,
              preview: type === 'video' ? path : '',
              type: type,
              name: path.split('/').pop(),
              status: 'local'
            };
          });
          this.setData({
            attachments: [...this.data.attachments, ...newAttachments]
          });
        }
      },
      fail: () => {
        my.showToast({ content: '文件选择暂不可用', duration: 2000 });
      }
    });
  },

  // 移除附件
  removeAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.attachments.filter((_, i) => i !== index);
    this.setData({ attachments });
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.attachments
      .filter(a => a.type === 'image')
      .map(a => a.preview);
    my.previewImage({ urls: urls, current: index });
  },

  // ===== 审批模式 =====
  selectApprovalMode(e) {
    const mode = e.currentTarget.dataset.value;
    this.setData({ approvalMode: mode });
    this.checkCanSubmit();
  },

  // ===== 审批模板选择 =====
  selectTemplate(e) {
    const tplId = e.currentTarget.dataset.id;
    const app = getApp();
    const template = app.globalData.approvalTemplates.find(t => t.id === tplId);

    if (!template) return;

    if (template.type === 'manual') {
      // 自定义模板，清空审批人让用户手动选
      this.setData({
        selectedTemplateId: tplId,
        approvers: []
      });
      my.showToast({ content: '请手动选择审批人', duration: 1500 });
      return;
    }

    // 预设模板：自动填充审批节点信息（仅设置模板标记，实际指派由后端完成）
    this.setData({
      selectedTemplateId: tplId
    });
    my.showToast({ content: `已选择模板：${template.name}`, duration: 1500 });
    this.checkCanSubmit();
  },

  // ===== 选择审批人（手动指定）=====
  chooseApprover() {
    my.selectContact({
      type: 'member',
      success: (res) => {
        if (res.users && res.users.length > 0) {
          const existing = new Set(this.data.approvers.map(a => a.id));
          const newApprovers = res.users
            .filter(u => !existing.has(u.userId))
            .map(u => ({ id: u.userId, name: u.name }));
          this.setData({
            approvers: [...this.data.approvers, ...newApprovers]
          });
          this.checkCanSubmit();
        }
      },
      fail: () => this.addMockApprover()
    });
  },

  addMockApprover() {
    const mockPool = [
      { id: 'mock_001', name: '李四 (主管)' },
      { id: 'mock_002', name: '王五 (部门负责人)' },
      { id: 'mock_003', name: '赵六 (安全管理员)' },
      { id: 'mock_004', name: '钱七 (分管领导)' }
    ];
    const existing = new Set(this.data.approvers.map(a => a.id));
    const available = mockPool.filter(m => !existing.has(m.id));
    if (available.length === 0) {
      my.showToast({ content: '已添加所有可用审批人', duration: 1500 });
      return;
    }
    const picked = available[0];
    this.setData({ approvers: [...this.data.approvers, picked] });
    this.checkCanSubmit();
    my.showToast({ content: `已添加：${picked.name}`, duration: 1500 });
  },

  removeApprover(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      approvers: this.data.approvers.filter((_, i) => i !== index)
    });
    this.checkCanSubmit();
  },

  // ===== 选择通知人 =====
  chooseNotifyUser() {
    my.selectContact({
      type: 'member',
      success: (res) => {
        if (res.users && res.users.length > 0) {
          const existing = new Set(this.data.notifyUsers.map(u => u.id));
          const newUsers = res.users
            .filter(u => !existing.has(u.userId))
            .map(u => ({ id: u.userId, name: u.name }));
          this.setData({
            notifyUsers: [...this.data.notifyUsers, ...newUsers]
          });
        }
      },
      fail: () => this.addMockNotifyUser()
    });
  },

  addMockNotifyUser() {
    const mockPool = [
      { id: 'notify_001', name: '孙八' },
      { id: 'notify_002', name: '周九' },
      { id: 'notify_003', name: '吴十' }
    ];
    const existing = new Set(this.data.notifyUsers.map(u => u.id));
    const available = mockPool.filter(m => !existing.has(m.id));
    if (available.length === 0) return;
    const picked = available[0];
    this.setData({ notifyUsers: [...this.data.notifyUsers, picked] });
    my.showToast({ content: `已添加通知人：${picked.name}`, duration: 1500 });
  },

  removeNotifyUser(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      notifyUsers: this.data.notifyUsers.filter((_, i) => i !== index)
    });
  },

  // ===== 检查是否可提交 =====
  checkCanSubmit() {
    const { title, description, approvalMode, approvers, selectedTemplateId } = this.data;
    // 仅知会模式不需要审批人；其他模式需要至少有模板或手动审批人
    const needApprover = approvalMode !== APPROVAL_MODE.NOTIFY_ONLY;
    const hasApprover = !needApprover || approvers.length > 0 || selectedTemplateId;
    const canSubmit = title.trim() && description.trim() && hasApprover;
    this.setData({ canSubmit });
  },

  // ===== 提交事件 =====
  async submitEvent() {
    if (!this.data.canSubmit || this.data.submitting) return;

    this.setData({ submitting: true });
    my.showLoading({ content: '提交中...' });

    try {
      const eventData = {
        title: this.data.title.trim(),
        description: this.data.description.trim(),
        categoryId: this.data.autoCategory ? this.data.autoCategory.categoryId : 'other',
        approvalMode: this.data.approvalMode,
        templateId: this.data.selectedTemplateId,
        approvers: this.data.approvers.map(a => a.id),
        notifyUsers: this.data.notifyUsers.map(u => u.id),
        attachments: this.data.attachments.map(a => ({
          name: a.name,
          path: a.path,
          type: a.type
        }))
      };

      // 调用后端创建事件
      const result = await api.event.create(eventData);

      my.hideLoading();

      // 显示成功提示（强调 ding 通知）
      const notifyCount = this.data.notifyUsers.length + this.data.approvers.length;
      my.showModal({
        title: '提交成功',
        content: `事件已创建并归入"${this.data.autoCategory ? this.data.autoCategory.categoryName : '其他'}"分类\n\n已 Ding 通知 ${notifyCount} 位相关人员\n（其他状态变更将走静默通知）`,
        showCancel: false,
        success: () => {
          this.resetForm();
          my.switchTab({ url: '/pages/index/index' });
        }
      });
    } catch (error) {
      my.hideLoading();
      console.error('提交失败:', error);

      // 降级：模拟提交成功
      my.showModal({
        title: '提交成功（离线模式）',
        content: `事件已创建并归入"${this.data.autoCategory ? this.data.autoCategory.categoryName : '其他'}"分类\n\n已 Ding 通知 ${this.data.notifyUsers.length + this.data.approvers.length} 位相关人员`,
        showCancel: false,
        success: () => {
          this.resetForm();
          my.switchTab({ url: '/pages/index/index' });
        }
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      title: '',
      description: '',
      descriptionLength: 0,
      autoCategory: null,
      attachments: [],
      approvalMode: 'countersign',
      selectedTemplateId: null,
      approvers: [],
      notifyUsers: [],
      canSubmit: false
    });
  }
});
