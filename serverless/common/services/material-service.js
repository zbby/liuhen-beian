/**
 * common/services/material-service.js
 * 甲供材服务 — 入库/出库/转借/归还 + 库存管理
 */

const { BizError, ERROR_CODES, nowISO, generateBizNo, requireFields, normalizePagination } = require('../utils/helper');
const { MAT_INVENTORY_STATUS, LEDGER_CHANGE_TYPE, BIZ_NO_PREFIX } = require('../utils/constants');

class MaterialService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 甲供材仪表盘统计
   */
  async getDashboard(orgId) {
    // 简化版：统计各状态库存数量
    const inventory = await this.dao.inventory.find({});

    const stats = {
      total: inventory.length,
      in_stock: 0,
      transferred: 0,
      consumed: 0,
      returned: 0,
      scrapped: 0,
    };

    for (const item of inventory) {
      switch (item.status) {
        case MAT_INVENTORY_STATUS.IN_STOCK_CENTER:
        case MAT_INVENTORY_STATUS.IN_STOCK_PROJECT:
        case MAT_INVENTORY_STATUS.ON_SITE_PENDING:
        case MAT_INVENTORY_STATUS.TRANSFERRED_IN:
          stats.in_stock++;
          break;
        case MAT_INVENTORY_STATUS.TRANSFERRED_OUT:
          stats.transferred++;
          break;
        case MAT_INVENTORY_STATUS.CONSUMED:
          stats.consumed++;
          break;
        case MAT_INVENTORY_STATUS.RETURNED_TO_SUPPLIER:
          stats.returned++;
          break;
        case MAT_INVENTORY_STATUS.SCRAPPED:
        case MAT_INVENTORY_STATUS.LOST:
          stats.scrapped++;
          break;
      }
    }

    return stats;
  }

  /**
   * 入库
   */
  async stockIn(accountId, orgId, data) {
    requireFields(data, ['material_id', 'warehouse_id', 'quantity']);

    const year = new Date().getFullYear();
    const seq = await this.dao.sequence.nextVal(orgId, BIZ_NO_PREFIX.MATERIAL_IN, year);
    const bizNo = generateBizNo(BIZ_NO_PREFIX.MATERIAL_IN, seq);

    // 1. 创建库存记录
    const inventoryId = await this.dao.inventory.insertOne({
      warehouse_id: data.warehouse_id,
      material_id: data.material_id,
      project_id: data.project_id || null,
      batch_no: data.batch_no || bizNo,
      serial_no: data.serial_no || null,
      quantity: data.quantity,
      status: MAT_INVENTORY_STATUS.IN_STOCK_CENTER,
      location: data.location || '',
      inbound_at: nowISO(),
    });

    // 2. 写库存流水
    await this.dao.stockLedger.insertOne({
      ledger_no: `LS${Date.now()}`,
      inventory_id: inventoryId,
      material_id: data.material_id,
      warehouse_id: data.warehouse_id,
      project_id: data.project_id || null,
      batch_no: data.batch_no || bizNo,
      serial_no: data.serial_no || null,
      change_type: LEDGER_CHANGE_TYPE.INBOUND,
      quantity_change: data.quantity,
      quantity_after: data.quantity,
      biz_type: 'MATERIAL_IN',
      biz_order_id: null,
      biz_order_no: bizNo,
      operator_user_id: accountId,
      operated_at: nowISO(),
      remark: data.remark || '',
    });

    // 3. 审计
    await this.dao.auditLog.append({
      org_id: orgId,
      category: 'DATA',
      actor_id: accountId,
      action: 'MATERIAL_STOCK_IN',
      target_type: 'inventory',
      target_id: inventoryId,
    });

    return { inventory_id: inventoryId, biz_no: bizNo };
  }

  /**
   * 出库
   */
  async stockOut(accountId, orgId, data) {
    requireFields(data, ['inventory_id', 'quantity']);

    const inventory = await this.dao.inventory.findById(data.inventory_id);
    if (!inventory) throw new BizError(ERROR_CODES.MATERIAL_NOT_FOUND, '库存记录不存在');

    if (!['IN_STOCK_CENTER', 'IN_STOCK_PROJECT'].includes(inventory.status)) {
      throw new BizError(ERROR_CODES.MATERIAL_INVALID_OPERATION, '当前状态不可出库');
    }

    if (inventory.quantity < data.quantity) {
      throw new BizError(ERROR_CODES.MATERIAL_INSUFFICIENT_STOCK, '库存不足');
    }

    const year = new Date().getFullYear();
    const seq = await this.dao.sequence.nextVal(orgId, BIZ_NO_PREFIX.MATERIAL_OUT, year);
    const bizNo = generateBizNo(BIZ_NO_PREFIX.MATERIAL_OUT, seq);

    const newQuantity = inventory.quantity - data.quantity;
    const newStatus = newQuantity === 0 ? MAT_INVENTORY_STATUS.CONSUMED : inventory.status;

    // 更新库存
    await this.dao.inventory.updateById(data.inventory_id, {
      quantity: newQuantity,
      status: newStatus,
    });

    // 写流水
    await this.dao.stockLedger.insertOne({
      ledger_no: `LS${Date.now()}`,
      inventory_id: data.inventory_id,
      material_id: inventory.material_id,
      warehouse_id: inventory.warehouse_id,
      project_id: inventory.project_id,
      batch_no: inventory.batch_no,
      serial_no: inventory.serial_no,
      change_type: LEDGER_CHANGE_TYPE.OUTBOUND,
      quantity_change: -data.quantity,
      quantity_after: newQuantity,
      biz_type: 'MATERIAL_OUT',
      biz_order_id: null,
      biz_order_no: bizNo,
      operator_user_id: accountId,
      operated_at: nowISO(),
      remark: data.remark || '',
    });

    return { inventory_id: data.inventory_id, biz_no: bizNo, remaining: newQuantity };
  }

  /**
   * 转借
   */
  async transfer(accountId, orgId, data) {
    requireFields(data, ['inventory_id', 'to_project_id']);

    const inventory = await this.dao.inventory.findById(data.inventory_id);
    if (!inventory) throw new BizError(ERROR_CODES.MATERIAL_NOT_FOUND, '库存记录不存在');

    const year = new Date().getFullYear();
    const seq = await this.dao.sequence.nextVal(orgId, BIZ_NO_PREFIX.MATERIAL_TRANSFER, year);
    const bizNo = generateBizNo(BIZ_NO_PREFIX.MATERIAL_TRANSFER, seq);

    // 更新原库存状态
    await this.dao.inventory.updateById(data.inventory_id, {
      status: MAT_INVENTORY_STATUS.TRANSFERRED_OUT,
    });

    // 写流水（转出）
    await this.dao.stockLedger.insertOne({
      ledger_no: `LS${Date.now()}`,
      inventory_id: data.inventory_id,
      material_id: inventory.material_id,
      warehouse_id: inventory.warehouse_id,
      project_id: inventory.project_id,
      change_type: LEDGER_CHANGE_TYPE.TRANSFER_OUT,
      quantity_change: 0,
      quantity_after: inventory.quantity,
      biz_type: 'MATERIAL_TRANSFER',
      biz_order_no: bizNo,
      operator_user_id: accountId,
      operated_at: nowISO(),
      remark: `转借至项目 ${data.to_project_id}`,
    });

    return { inventory_id: data.inventory_id, biz_no: bizNo };
  }

  /**
   * 归还/退库
   */
  async returnMaterial(accountId, orgId, data) {
    requireFields(data, ['inventory_id']);

    const inventory = await this.dao.inventory.findById(data.inventory_id);
    if (!inventory) throw new BizError(ERROR_CODES.MATERIAL_NOT_FOUND, '库存记录不存在');

    const year = new Date().getFullYear();
    const seq = await this.dao.sequence.nextVal(orgId, BIZ_NO_PREFIX.MATERIAL_RETURN, year);
    const bizNo = generateBizNo(BIZ_NO_PREFIX.MATERIAL_RETURN, seq);

    // 更新库存状态
    await this.dao.inventory.updateById(data.inventory_id, {
      status: MAT_INVENTORY_STATUS.RETURNED_TO_SUPPLIER,
    });

    // 写流水
    await this.dao.stockLedger.insertOne({
      ledger_no: `LS${Date.now()}`,
      inventory_id: data.inventory_id,
      material_id: inventory.material_id,
      warehouse_id: inventory.warehouse_id,
      project_id: inventory.project_id,
      change_type: LEDGER_CHANGE_TYPE.RETURN,
      quantity_change: 0,
      quantity_after: inventory.quantity,
      biz_type: 'MATERIAL_RETURN',
      biz_order_no: bizNo,
      operator_user_id: accountId,
      operated_at: nowISO(),
      remark: data.remark || '',
    });

    return { inventory_id: data.inventory_id, biz_no: bizNo };
  }

  /**
   * 库存列表
   */
  async listInventory(query = {}, options = {}) {
    const { page, size } = normalizePagination(options);
    return this.dao.inventory.findPage(query, { page, size, sort: { inbound_at: -1 } });
  }

  /**
   * 库存流水
   */
  async getFlowLog(inventoryId, options = {}) {
    const { page, size } = normalizePagination(options);
    return this.dao.stockLedger.findPage(
      { inventory_id: inventoryId },
      { page, size, sort: { operated_at: -1 } }
    );
  }
}

module.exports = MaterialService;
