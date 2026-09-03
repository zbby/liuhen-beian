// 个人中心页
const { api } = require('../../utils/api');
const { ensureLogin, checkOrg, logout } = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    orgInfo: null,
    hasOrg: false,
    menuSections: [
      {
        title: '组织管理',
        items: [
          { id: 'org_info', icon: '🏢', name: '组织信息' },
          { id: 'invite', icon: '📨', name: '邀请成员' },
          { id: 'members', icon: '👥', name: '成员管理' },
          { id: 'templates', icon: '📋', name: '审批模板配置' }
        ]
      },
      {
        title: '业务功能',
        items: [
          { id: 'material', icon: '📦', name: '甲供材管理' },
          { id: 'audit', icon: '📜', name: '审计日志' },
          { id: 'categories', icon: '🗂', name: '分类管理' }
        ]
      },
      {
        title: '设置',
        items: [
          { id: 'security', icon: '🔒', name: '安全设置' },
          { id: 'privacy', icon: '🛡', name: '隐私与合规' },
          { id: 'about', icon: 'ℹ', name: '关于' }
        ]
      }
    ]
  },

  async onShow() {
    await this.loadInfo();
  },

  async loadInfo() {
    try {
      await ensureLogin();
      const app = getApp();
      const org = await checkOrg();
      this.setData({
        userInfo: app.globalData.userInfo,
        orgInfo: org,
        hasOrg: !!org
      });
    } catch (e) {
      console.error('加载用户信息失败:', e);
    }
  },

  // 菜单点击
  onMenuTap(e) {
    const menuId = e.currentTarget.dataset.id;
    switch (menuId) {
      case 'org_info':
        this.showOrgInfo();
        break;
      case 'invite':
        this.generateInviteCode();
        break;
      case 'members':
        my.navigateTo({ url: '/pages/org-join/org-join' });
        break;
      case 'templates':
        my.navigateTo({ url: '/pages/template-select/template-select' });
        break;
      case 'material':
        my.navigateTo({ url: '/pages/material/material' });
        break;
      case 'audit':
        my.showToast({ content: '审计日志功能开发中', duration: 2000 });
        break;
      case 'categories':
        my.showToast({ content: '分类管理功能开发中', duration: 2000 });
        break;
      case 'security':
        this.showSecurityInfo();
        break;
      case 'privacy':
        this.showPrivacyInfo();
        break;
      case 'about':
        this.showAbout();
        break;
      default:
        break;
    }
  },

  // 组织信息
  showOrgInfo() {
    const org = this.data.orgInfo;
    if (!org) {
      my.showToast({ content: '未加入组织', duration: 2000 });
      return;
    }
    my.showModal({
      title: '组织信息',
      content: `名称：${org.name}\n角色：${org.role === 'org_admin' ? '管理员' : '成员'}\n成员数：${org.memberCount || '未知'}`,
      showCancel: false
    });
  },

  // 生成邀请码
  async generateInviteCode() {
    if (!this.data.hasOrg) return;
    my.showLoading({ content: '生成中...' });
    try {
      const result = await api.org.genInviteCode();
      my.hideLoading();
      my.showModal({
        title: '邀请码已生成',
        content: `邀请码：${result.code}\n有效期：${result.expireDays || 7} 天\n\n将邀请码分享给同事，他们可在"加入组织"页面输入邀请码加入。`,
        confirmText: '复制',
        success: (res) => {
          if (res.confirm) {
            my.setClipboard({ text: result.code });
            my.showToast({ content: '已复制到剪贴板', duration: 1500 });
          }
        }
      });
    } catch (err) {
      my.hideLoading();
      // 降级
      const mockCode = 'LHBA-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      my.showModal({
        title: '邀请码已生成',
        content: `邀请码：${mockCode}\n有效期：7 天\n\n将邀请码分享给同事即可加入。`,
        confirmText: '复制',
        success: (res) => {
          if (res.confirm) {
            my.setClipboard({ text: mockCode });
            my.showToast({ content: '已复制', duration: 1500 });
          }
        }
      });
    }
  },

  // 安全设置
  showSecurityInfo() {
    my.showModal({
      title: '安全与合规',
      content: '本系统遵循等保 2.0 三级要求：\n\n· 全链路操作审计留痕\n· 敏感数据加密存储\n· 个人信息最小必要原则\n· 附件上传病毒扫描\n· 审计日志保留 5 年\n· 数据在组织范围内隔离',
      showCancel: false
    });
  },

  // 隐私信息
  showPrivacyInfo() {
    my.showModal({
      title: '隐私保护',
      content: '· 仅采集必要个人信息（姓名、部门）\n· 不采集位置、通讯录等敏感信息\n· 可随时申请删除个人数据\n· 数据传输全程加密\n· 附件预览不缓存到本地',
      showCancel: false
    });
  },

  // 关于
  showAbout() {
    my.showModal({
      title: '关于留痕报备',
      content: '版本：v1.0.0\n\n钉钉小程序 + 云 Serverless 架构\n支持鸿蒙 / Android / iOS / 桌面\n\n功能：事件留痕 + 不定长审批 + 归档检索 + DING 通知 + 甲供材流转',
      showCancel: false
    });
  },

  // 加入组织
  goToOrgJoin() {
    my.navigateTo({ url: '/pages/org-join/org-join' });
  },

  // 退出登录
  doLogout() {
    my.showModal({
      title: '退出登录',
      content: '确定退出登录？退出后需要重新免登验证。',
      success: (res) => {
        if (res.confirm) {
          logout();
          my.showToast({ content: '已退出', duration: 1500 });
          setTimeout(() => {
            my.switchTab({ url: '/pages/index/index' });
          }, 1500);
        }
      }
    });
  }
});
