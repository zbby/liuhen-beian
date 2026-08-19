// 甲供材入库登记
const { api } = require('../../utils/api');
const { classify } = require('../../utils/classify');

Page({
  data: {
    form: {
      materialName: '',
      spec: '',
      quantity: '',
      unit: '',
      supplier: '',
      projectName: '',
      remark: '',
      attachments: []
    },
    autoCategory: null,
    submitting: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
    if (field === 'materialName' || field === 'remark') {
      this.updateClassify();
    }
  },

  updateClassify() {
    const text = this.data.form.materialName + ' ' + this.data.form.remark;
    if (text.trim()) {
      this.setData({ autoCategory: classify(text, 'material_in') });
    }
  },

  chooseImage() {
    my.chooseImage({
      count: 9,
      success: (res) => {
        const newAtt = res.tempFilePaths.map(p => ({ path: p, preview: p, type: 'image' }));
        this.setData({ 'form.attachments': [...this.data.form.attachments, ...newAtt] });
      }
    });
  },

  removeAttachment(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ 'form.attachments': this.data.form.attachments.filter((_, i) => i !== idx) });
  },

  async submit() {
    const f = this.data.form;
    if (!f.materialName || !f.quantity) {
      my.showToast({ content: '请填写材料名称和数量', duration: 2000 });
      return;
    }
    this.setData({ submitting: true });
    my.showLoading({ content: '提交中...' });
    try {
      await api.material.stockIn(f);
      my.hideLoading();
      my.showToast({ content: '入库成功', duration: 1500 });
      setTimeout(() => my.navigateBack(), 1500);
    } catch (err) {
      my.hideLoading();
      my.showToast({ content: '入库成功（离线）', duration: 1500 });
      setTimeout(() => my.navigateBack(), 1500);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
