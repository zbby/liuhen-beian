/**
 * scripts/init-db.js
 * 云数据库集合与索引初始化脚本
 * 
 * 在钉钉开发者工具中执行或通过云函数触发
 * 逐集合创建，如果已存在则跳过
 */

const COLLECTIONS = {
  // 组织
  org_accounts: {
    indexes: [
      { key: { union_id: 1 }, unique: true },
      { key: { corp_id: 1, ding_user_id: 1 } },
    ],
  },
  org_organizations: {
    indexes: [
      { key: { org_code: 1 }, unique: true },
    ],
  },
  org_memberships: {
    indexes: [
      { key: { account_id: 1, org_id: 1 }, unique: true },
      { key: { org_id: 1, status: 1 } },
    ],
  },
  org_departments: {
    indexes: [
      { key: { org_id: 1, ding_dept_id: 1 }, unique: true },
    ],
  },

  // 事件
  evt_events: {
    indexes: [
      { key: { org_id: 1, status: 1, created_at: -1 } },
      { key: { initiator_id: 1, status: 1 } },
      { key: { involved_users: 1, status: 1 } },
      { key: { org_id: 1, category_path: 1 } },
    ],
  },
  evt_attachments: {
    indexes: [
      { key: { event_id: 1 } },
      { key: { sha256: 1 } },
    ],
  },
  evt_process_actions: {
    indexes: [
      { key: { event_id: 1, at: -1 } },
    ],
  },
  evt_categories: {
    indexes: [
      { key: { org_id: 1, parent_id: 1 } },
    ],
  },
  evt_event_type_configs: {
    indexes: [
      { key: { org_id: 1, type_code: 1 } },
    ],
  },

  // 审批
  apr_templates: {
    indexes: [
      { key: { org_id: 1, code: 1, version: -1 } },
    ],
  },
  apr_flows: {
    indexes: [
      { key: { event_id: 1 } },
    ],
  },
  apr_steps: {
    indexes: [
      { key: { flow_id: 1, step_no: 1 }, unique: true },
      { key: { status: 1, timeout_at: 1 } },
      { key: { candidate_user_ids: 1, status: 1 } },
    ],
  },
  apr_delegations: {
    indexes: [
      { key: { delegator_id: 1, end_at: -1 } },
    ],
  },

  // 甲供材
  mat_inventory: {
    indexes: [
      { key: { material_id: 1, warehouse_id: 1 } },
      { key: { project_id: 1, status: 1 } },
      { key: { serial_no: 1 }, unique: true, sparse: true },
    ],
  },
  mat_stock_ledger: {
    indexes: [
      { key: { inventory_id: 1, operated_at: 1 } },
      { key: { biz_type: 1, biz_order_id: 1 } },
      { key: { project_id: 1, operated_at: -1 } },
    ],
  },

  // 分类
  cls_rules: {
    indexes: [
      { key: { org_id: 1, enabled: 1, priority: -1 } },
    ],
  },
  cls_feedback: {
    indexes: [
      { key: { org_id: 1, is_correct: 1, created_at: -1 } },
    ],
  },

  // 通知
  ntf_notifications: {
    indexes: [
      { key: { org_id: 1, sent_at: -1 } },
    ],
  },
  ntf_preferences: {
    indexes: [
      { key: { account_id: 1, org_id: 1 }, unique: true },
    ],
  },
  ntf_templates: {
    indexes: [],
  },

  // 审计
  aud_audit_logs: {
    indexes: [
      { key: { org_id: 1, at: -1 } },
      { key: { actor_id: 1, at: -1 } },
      { key: { target_type: 1, target_id: 1, at: -1 } },
      { key: { category: 1, at: -1 } },
    ],
  },

  // 系统
  sys_configs: {
    indexes: [
      { key: { org_id: 1, key: 1 }, unique: true },
    ],
  },
  sys_sequences: {
    indexes: [
      { key: { org_id: 1, prefix: 1, year: 1 }, unique: true },
    ],
  },
};

/**
 * 初始化入口
 * @param {object} db  云数据库实例
 */
async function initDatabase(db) {
  const results = { created: [], skipped: [], errors: [] };

  for (const [name, config] of Object.entries(COLLECTIONS)) {
    try {
      // 尝试创建集合
      await db.createCollection(name);
      results.created.push(name);

      // 创建索引
      if (config.indexes && config.indexes.length > 0) {
        for (const idx of config.indexes) {
          try {
            await db.collection(name).createIndex(idx.key, {
              unique: idx.unique || false,
              sparse: idx.sparse || false,
            });
          } catch (idxErr) {
            console.warn(`索引创建警告 ${name}:`, idxErr.message);
          }
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        results.skipped.push(name);
      } else {
        results.errors.push({ collection: name, error: err.message });
      }
    }
  }

  // 插入系统内置审批模板
  await seedDefaultTemplates(db);

  return results;
}

/**
 * 插入内置审批模板
 */
async function seedDefaultTemplates(db) {
  const collection = db.collection('apr_templates');

  const templates = [
    {
      org_id: null, // 全局内置
      code: 'DIRECT_MANAGER',
      name: '直属主管审批',
      biz_types: ['GENERAL', 'INCIDENT', 'MEETING'],
      description: '仅需直属主管审批',
      is_default: true,
      priority: 1,
      steps: [
        {
          step_no: 1,
          name: '直属主管审批',
          node_type: 'APPROVAL',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'direct_manager' } },
          timeout_hours: 24,
          timeout_action: 'REMIND',
          is_dynamic_insertable: true,
        },
      ],
      version: 1,
      status: 'ACTIVE',
    },
    {
      org_id: null,
      code: 'MANAGER_AND_DEPT',
      name: '主管 + 部门负责人',
      biz_types: ['GENERAL', 'COMPLIANCE'],
      description: '二级审批',
      is_default: false,
      priority: 2,
      steps: [
        {
          step_no: 1,
          name: '直属主管审批',
          node_type: 'APPROVAL',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'direct_manager' } },
          timeout_hours: 24,
          timeout_action: 'REMIND',
          is_dynamic_insertable: true,
        },
        {
          step_no: 2,
          name: '部门负责人审批',
          node_type: 'APPROVAL',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'dept_head' } },
          timeout_hours: 48,
          timeout_action: 'ESCALATE',
          is_dynamic_insertable: false,
        },
      ],
      version: 1,
      status: 'ACTIVE',
    },
    {
      org_id: null,
      code: 'THREE_LEVEL',
      name: '三级审批（主管→部门→分管领导）',
      biz_types: ['GENERAL', 'MATERIAL_TRANSFER'],
      description: '三级审批',
      is_default: false,
      priority: 3,
      steps: [
        {
          step_no: 1,
          name: '直属主管',
          node_type: 'APPROVAL',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'direct_manager' } },
          timeout_hours: 24,
          timeout_action: 'REMIND',
          is_dynamic_insertable: true,
        },
        {
          step_no: 2,
          name: '部门负责人',
          node_type: 'APPROVAL',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'dept_head' } },
          timeout_hours: 48,
          timeout_action: 'ESCALATE',
          is_dynamic_insertable: false,
        },
        {
          step_no: 3,
          name: '分管领导',
          node_type: 'APPROVAL',
          mode: 'ANY_SIGN',
          assignment: { type: 'AUTO', rule: { role: 'vp' } },
          timeout_hours: 72,
          timeout_action: 'AUTO_PASS',
          is_dynamic_insertable: false,
        },
      ],
      version: 1,
      status: 'ACTIVE',
    },
    {
      org_id: null,
      code: 'NOTIFY_ONLY',
      name: '仅通知（不需审批）',
      biz_types: ['GENERAL', 'MEETING'],
      description: '仅知会，无需审批',
      is_default: false,
      priority: 4,
      steps: [
        {
          step_no: 1,
          name: '知会',
          node_type: 'CC',
          mode: 'NOTIFY_ONLY',
          assignment: { type: 'MANUAL' },
          timeout_hours: null,
          timeout_action: null,
          is_dynamic_insertable: false,
        },
      ],
      version: 1,
      status: 'ACTIVE',
    },
    {
      org_id: null,
      code: 'MATERIAL_FLOW',
      name: '甲供材流转审批',
      biz_types: ['MATERIAL_IN', 'MATERIAL_OUT', 'MATERIAL_TRANSFER', 'MATERIAL_RETURN'],
      description: '甲供材出入库、转借、归还审批',
      is_default: true,
      priority: 1,
      steps: [
        {
          step_no: 1,
          name: '项目负责人审批',
          node_type: 'APPROVAL',
          mode: 'ANY_SIGN',
          assignment: { type: 'AUTO', rule: { role: 'project_manager' } },
          timeout_hours: 24,
          timeout_action: 'REMIND',
          is_dynamic_insertable: true,
        },
        {
          step_no: 2,
          name: '物资管理员确认',
          node_type: 'ACTION',
          mode: 'COUNTERSIGN',
          assignment: { type: 'AUTO', rule: { role: 'material_admin' } },
          timeout_hours: 48,
          timeout_action: 'ESCALATE',
          is_dynamic_insertable: false,
        },
      ],
      version: 1,
      status: 'ACTIVE',
    },
  ];

  for (const tpl of templates) {
    try {
      await collection.add(tpl);
    } catch (err) {
      console.warn(`模板 ${tpl.code} 可能已存在:`, err.message);
    }
  }
}

// 导出
module.exports = { initDatabase, COLLECTIONS };

// 如果直接运行
if (require.main === module) {
  console.log('请通过钉钉开发者工具云函数环境运行此脚本');
  console.log('或将其包装为云函数调用 initDatabase(db)');
}
