// 发起留痕备案
Page({
  data: {
    title: '',
    description: '',
    descriptionLength: 0,
    autoCategory: null,
    attachments: [],
    approvalMode: 'countersign', // countersign | orSign | notifyOnly
    approvalModes: [],
    approvalTemplates: [],
    selectedTemplate: null,
    approvers: [],
    notifyUsers: [],
    canSubmit: false
  },

  onLoad() {
    const app = getApp();
    this.setData({
      approvalModes: app.globalData.approvalModes,
      approvalTemplates: app.globalData.approvalTemplates
    });
  },

  // 标题输入
  onTitleInput(e) {
    const title = e.detail.value;
    this.setData({ title });
    this.checkCanSubmit();
  },

  // 描述输入
  onDescriptionInput(e) {
    const description = e.detail.value;
    this.setData({
      description,
      descriptionLength: description.length
    });
    this.autoClassify(description);
    this.checkCanSubmit();
  },

  // 自动分类 (基于关键词匹配)
  autoClassify(text) {
    const app = getApp();
    const categories = app.globalData.eventCategories;
    
    let matchedCategory = categories.find(cat => 
      cat.keywords.some(keyword => text.includes(keyword))
    );
    
    if (!matchedCategory) {
      matchedCategory = categories.find(cat => cat.id === 'other');
    }
    
    this.setData({
      autoCategory: matchedCategory
    });
  },

  // 选择审批模式
  selectApprovalMode(e) {
    const approvalMode = e.currentTarget.dataset.value;
    this.setData({ approvalMode });
    this.checkCanSubmit();
  },

  // 选择模板
  selectTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    const app = getApp();
    const template = app.globalData.approvalTemplates.find(t => t.id === templateId);
    
    if (template) {
      this.setData({ selectedTemplate: templateId });
      
      // 根据模板添加审批人 (这里简化处理，实际需要调用钉钉选人组件)
      my.showToast({
        content: `已选择模板：${template.name}`,
        duration: 1500
      });
    }
  },

  // 选择图片附件
  chooseImage() {
    my.chooseImage({
      count: 9,
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newAttachments = res.tempFilePaths.map(path => ({
          preview: path,
          path: path
        }));
        
        this.setData({
          attachments: [...this.data.attachments, ...newAttachments]
        });
      }
    });
  },

  // 移除附件
  removeAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const attachments = this.data.attachments.filter((_, i) => i !== index);
    this.setData({ attachments });
  },

  // 选择审批人
  chooseApprover() {
    // 调用钉钉选人组件
    my.selectContact({
      type: 'member',
      success: (res) => {
        if (res.users && res.users.length > 0) {
          const newApprovers = res.users.map(user => ({
            id: user.userId,
            name: user.name
          }));
          this.setData({
            approvers: [...this.data.approvers, ...newApprovers]
          });
          this.checkCanSubmit();
          
          my.showToast({
            content: `已添加 ${newApprovers.length} 位审批人`,
            duration: 1500
          });
        }
      },
      fail: () => {
        // 如果钉钉选人不可用，使用模拟数据
        this.addMockApprover();
      }
    });
  },
  
  // 添加模拟审批人 (用于测试)
  addMockApprover() {
    const mockApprovers = [
      { id: 'mock1', name: '李四 (主管)' },
      { id: 'mock2', name: '王五 (部门负责人)' },
      { id: 'mock3', name: '赵六 (安全管理员)' }
    ];
    const randomApprover = mockApprovers[Math.floor(Math.random() * mockApprovers.length)];
    
    if (!this.data.approvers.find(a => a.id === randomApprover.id)) {
      this.setData({
        approvers: [...this.data.approvers, randomApprover]
      });
      this.checkCanSubmit();
      
      my.showToast({
        content: `已添加：${randomApprover.name}`,
        duration: 1500
      });
    }
  },

  // 移除审批人
  removeApprover(e) {
    const index = e.currentTarget.dataset.index;
    const approvers = this.data.approvers.filter((_, i) => i !== index);
    this.setData({ approvers });
    this.checkCanSubmit();
  },

  // 选择通知人
  chooseNotifyUser() {
    my.selectContact({
      type: 'member',
      success: (res) => {
        if (res.users && res.users.length > 0) {
          const newNotifyUsers = res.users.map(user => ({
            id: user.userId,
            name: user.name
          }));
          this.setData({
            notifyUsers: [...this.data.notifyUsers, ...newNotifyUsers]
          });
          
          my.showToast({
            content: `已添加 ${newNotifyUsers.length} 位通知人`,
            duration: 1500
          });
        }
      },
      fail: () => {
        // 模拟添加通知人
        this.addMockNotifyUser();
      }
    });
  },
  
  // 添加模拟通知人 (用于测试)
  addMockNotifyUser() {
    const mockUsers = [
      { id: 'notify1', name: '钱七' },
      { id: 'notify2', name: '孙八' },
      { id: 'notify3', name: '周九' }
    ];
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    
    if (!this.data.notifyUsers.find(u => u.id === randomUser.id)) {
      this.setData({
        notifyUsers: [...this.data.notifyUsers, randomUser]
      });
      
      my.showToast({
        content: `已添加通知人：${randomUser.name}`,
        duration: 1500
      });
    }
  },

  // 移除通知人
  removeNotifyUser(e) {
    const index = e.currentTarget.dataset.index;
    const notifyUsers = this.data.notifyUsers.filter((_, i) => i !== index);
    this.setData({ notifyUsers });
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { title, description, approvalMode, approvers } = this.data;
    const canSubmit = title.trim() && description.trim() && 
      (approvalMode === 'notifyOnly' || approvers.length > 0);
    this.setData({ canSubmit });
  },

  // 提交事件
  async submitEvent() {
    if (!this.data.canSubmit) {
      my.showToast({
        content: '请填写完整信息',
        duration: 2000
      });
      return;
    }

    my.showLoading({ content: '提交中...' });

    try {
      // 模拟提交到后端
      const eventData = {
        title: this.data.title,
        description: this.data.description,
        category: (this.data.autoCategory && this.data.autoCategory.id) || 'other',
        approvalMode: this.data.approvalMode,
        approvers: this.data.approvers,
        notifyUsers: this.data.notifyUsers,
        attachments: this.data.attachments
      };
      
      console.log('提交的事件数据:', eventData);
      
      // 模拟 API 调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      my.hideLoading();
      
      // 显示成功提示，模拟 Ding 通知
      my.showModal({
        title: '✅ 提交成功',
        content: `事件已创建！\n\n已 Ding 通知 ${this.data.notifyUsers.length + this.data.approvers.length} 位相关人员`,
        showCancel: false,
        success: () => {
          // 返回首页并刷新数据
          const pages = my.getCurrentPages();
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2];
            if (prevPage.loadData) {
              prevPage.loadData();
            }
          }
          my.navigateBack();
        }
      });

    } catch (error) {
      my.hideLoading();
      my.showFail({
        content: '提交失败，请重试'
      });
      console.error('提交失败:', error);
    }
  }
});
