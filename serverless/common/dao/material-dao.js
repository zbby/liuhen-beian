/**
 * common/dao/material-dao.js
 * 甲供材数据访问
 */

const BaseDao = require('./base-dao');

class InventoryDao extends BaseDao {
  constructor(db) {
    super(db, 'mat_inventory');
  }

  async findByWarehouse(warehouseId) {
    return this.find({ warehouse_id: warehouseId }, { sort: { inbound_at: -1 } });
  }

  async findByProject(projectId, status = null) {
    const query = { project_id: projectId };
    if (status) query.status = status;
    return this.find(query, { sort: { inbound_at: -1 } });
  }

  async findBySerialNo(serialNo) {
    return this.findOne({ serial_no: serialNo });
  }
}

class StockLedgerDao extends BaseDao {
  constructor(db) {
    super(db, 'mat_stock_ledger');
  }

  async findByInventory(inventoryId, options = {}) {
    return this.find(
      { inventory_id: inventoryId },
      { sort: { operated_at: -1 }, ...options }
    );
  }

  async findByProject(projectId, options = {}) {
    return this.findPage(
      { project_id: projectId },
      { sort: { operated_at: -1 }, ...options }
    );
  }

  async findByBizOrder(bizType, bizOrderId) {
    return this.find({ biz_type: bizType, biz_order_id: bizOrderId });
  }
}

module.exports = { InventoryDao, StockLedgerDao };
