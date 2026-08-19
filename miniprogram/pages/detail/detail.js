// 事件详情页
Page({
  data: {
    eventId: null,
    event: {
      title: '',
      description: '',
      status: 'processing',
      statusText: '审批中',
      creator: '',
      createTime: '',
      category: '',
      attachments: [],
      approvalModeText: '',
      approvalFlow: [],
      notifyUsers: [],
      logs: []
    },
    canApprove: false
  },

  onLoad(options) {
    const eventId = options.id;
    this.setData({ eventId });
    this.loadEventDetail(eventId);
  },

  // 加载事件详情
  async loadEventDetail(eventId) {
    try {
      // TODO: 调用后端 API
      // 模拟数据
      this.setData({
        event: {
          title: '服务器配置变更备案',
          description: '生产环境数据库配置调整，涉及连接池参数优化，以提升系统性能和稳定性。本次变更经过测试环境验证，预计影响范围：无停机影响。',
          status: 'processing',
          statusText: '审批中',
          creator: '张三',
          createTime: '2026-05-20 14:30',
          category: '操作记录',
          attachments: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
          ],
          approvalModeText: '会签 (所有人都需同意)',
          approvalFlow: [
            {
              approverName: '李四 (直属主管)',
              role: '审批人',
              status: 'completed',
              statusText: '已同意',
              time: '2026-05-20 15:00',
              comment: '同意，注意观察变更后的系统性能',
              completed: true
            },
            {
              approverName: '王五 (部门负责人)',
              role: '审批人',
              status: 'pending',
              statusText: '待审批',
              time: '',
              comment: '',
              completed: false
            },
            {
              approverName: '赵六 (安全管理员)',
              role: '审批人',
              status: 'pending',
              statusText: '待审批',
              time: '',
              comment: '',
              completed: false
            }
          ],
          notifyUsers: [
            { name: '钱七', notified: true },
            { name: '孙八', notified: true }
          ],
          logs: [
            { time: '2026-05-20 14:30', content: '张三 创建了事件' },
            { time: '2026-05-20 14:30', content: '系统 Ding 通知了相关人员' },
            { time: '2026-05-20 15:00', content: '李四 审批通过' }
          ]
        },
        canApprove: true // 实际应根据当前用户是否为待审批人判断
      });
    } catch (error) {
      console.error('加载详情失败:', error);
      my.showToast({
        content: '加载失败',
        duration: 2000
      });
    }
  },

  // 预览附件
  previewAttachment(e) {
    const index = e.currentTarget.dataset.index;
    const url = this.data.event.attachments[index];
    
    my.previewImage({
      urls: this.data.event.attachments,
      current: url
    });
  },

  // 同意审批
  async approveEvent() {
    my.showModal({
      title: '确认审批',
      content: '是否同意该事件？',
      success: async (res) => {
        if (res.confirm) {
          // 显示审批意见输入框
          my.showModal({
            title: '审批意见',
            content: '请输入审批意见（可选）',
            editable: true,
            placeholderText: '同意，无其他意见',
            success: async (res2) => {
              if (res2.confirm || res2.cancel) {
                my.showLoading({ content: '提交中...' });
                
                const comment = res2.text || '同意';
                
                // 模拟 API 调用
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                my.hideLoading();
                my.showSuccess({ content: '✅ 审批通过' });
                
                // 更新审批流程 (模拟)
                const approvalFlow = this.data.event.approvalFlow;
                const pendingIndex = approvalFlow.findIndex(item => !item.completed);
                if (pendingIndex >= 0) {
                  approvalFlow[pendingIndex].completed = true;
                  approvalFlow[pendingIndex].status = 'completed';
                  approvalFlow[pendingIndex].statusText = '已同意';
                  approvalFlow[pendingIndex].comment = comment;
                  approvalFlow[pendingIndex].time = new Date().toLocaleString('zh-CN', { hour12: false });
                  
                  this.setData({ event: { ...this.data.event, approvalFlow } });
                  
                  // 添加日志
                  const logs = this.data.event.logs;
                  logs.unshift({
                    time: new Date().toLocaleString('zh-CN', { hour12: false }),
                    content: `你 审批通过：${comment}`
                  });
                  this.setData({ event: { ...this.data.event, logs } });
                }
              }
            }
          });
        }
      }
    });
  },

  // 驳回审批
  async rejectEvent() {
    my.showModal({
      title: '驳回事件',
      content: '请输入驳回理由',
      editable: true,
      placeholderText: '请说明驳回原因',
      success: async (res) => {
        if (res.confirm && res.text) {
          my.showLoading({ content: '提交中...' });
          
          const comment = res.text;
          
          // 模拟 API 调用
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          my.hideLoading();
          my.showSuccess({ content: '❌ 已驳回' });
          
          // 更新审批流程 (模拟)
          const approvalFlow = this.data.event.approvalFlow;
          const pendingIndex = approvalFlow.findIndex(item => !item.completed);
          if (pendingIndex >= 0) {
            approvalFlow[pendingIndex].completed = true;
            approvalFlow[pendingIndex].status = 'rejected';
            approvalFlow[pendingIndex].statusText = '已驳回';
            approvalFlow[pendingIndex].comment = comment;
            approvalFlow[pendingIndex].time = new Date().toLocaleString('zh-CN', { hour12: false });
            
            this.setData({ event: { ...this.data.event, approvalFlow } });
            
            // 添加日志
            const logs = this.data.event.logs;
            logs.unshift({
              time: new Date().toLocaleString('zh-CN', { hour12: false }),
              content: `你 驳回了事件：${comment}`
            });
            this.setData({ event: { ...this.data.event, logs } });
          }
        } else if (res.confirm && !res.text) {
          my.showToast({
            content: '请填写驳回理由',
            duration: 2000
          });
        }
      }
    });
  }
});
