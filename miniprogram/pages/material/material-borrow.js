// 甲供材转借调拨
const { api } = require('../../utils/api');
const { classify } = require('../../utils/classify');

Page({
  data: {
    form: { materialName: '', spec: '', quantity: '', fromProject: '', toProject: '', borrower: '', expectedReturnDate: '', remark: '', attachments: [] },
    autoCategory: null,
    submitting: false
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
    if (field === 'materialName' || field === 'remark') {
      const text = this.data.form.materialName + ' ' + this.data.form.remark;
      if (text.trim()) this.setData({ autoCategory: classify(text, 'material_borrow') });
    }
  },
  chooseImage() {
    my.chooseImage({ count: 9, success: (res) => {
      const att = res.tempFilePaths.map(p => ({ path: p, preview: p, type: 'image' }));
      this.setData({ 'form.attachments': [...this.data.form.attachments, ...att] });
    }});
  },
  removeAttachment(e) {
    this.setData({ 'form.attachments': this.data.form.attachments.filter((_, i) => i !== e.currentTarget.dataset.index) });
  },
  async submit() {
    if (!this.data.form.materialName || !this.data.form.quantity) {
      my.showToast({ content: '请填写材料名称和数量', duration: 2000 }); return;
    }
    this.setData({ submitting: true }); my.showLoading({ content: '提交中...' });
    try {
      await api.material.borrow(this.data.form);
      my.hideLoading(); my.showToast({ content: '转借成功', duration: 1500 });
      setTimeout(() => my.navigateBack(), 1500);
    } catch (err) {
      my.hideLoading(); my.showToast({ content: '转借成功（离线）', duration: 1500 });
      setTimeout(() => my.navigateBack(), 1500);
    } finally { this.setData({ submitting: false }); }
  }
});
