/**
 * common/services/event-service.js
 * 事件服务 — 事件 CRUD、状态流转、自动分类
 */

const { BizError, ERROR_CODES, generateBizNo, nowISO, requireFields, normalizePagination, pick } = require('../utils/helper');
const { EVENT_STATUS, BIZ_NO_PREFIX } = require('../utils/constants');

class EventService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 提交事件（含审批流触发）
   */
  async submit(accountId, orgId, eventData) {
    requireFields(eventData, ['title', 'description', 'event_type']);

    // 1. 生成事件编号
    const year = new Date().getFullYear();
    const seq = await this.dao.sequence.nextVal(orgId, BIZ_NO_PREFIX.EVENT, year);
    const eventNo = generateBizNo(BIZ_NO_PREFIX.EVENT, seq);

    // 2. 自动分类（如果未指定）
    let categoryId = eventData.category_id;
    let categoryPath = eventData.category_path;
    if (!categoryId) {
      const prediction = await this._predictCategory(eventData.title, eventData.description, eventData.event_type);
      categoryId = prediction.category_id;
      categoryPath = prediction.path;
    }

    // 3. 构建事件文档
    const event = {
      org_id: orgId,
      event_no: eventNo,
      event_type: eventData.event_type,
      category_id: categoryId,
      category_path: categoryPath || [],
      initiator_id: accountId,
      initiator_dept_id: eventData.initiator_dept_id || null,
      title: eventData.title,
      description: eventData.description,
      attachments: eventData.attachments || [],
      metadata: eventData.metadata || {},
      approval_flow_id: null,
      status: EVENT_STATUS.DRAFT,
      status_history: [
        {
          from: null,
          to: EVENT_STATUS.DRAFT,
          actor_id: accountId,
          action: 'CREATE',
          at: nowISO(),
        },
      ],
      involved_users: [accountId],
      must_notify_user_ids: [],
      optional_notify_user_ids: [],
      privacy_level: eventData.privacy_level || 'DEPT',
      visible_to: [],
      created_at: nowISO(),
      submitted_at: null,
      completed_at: null,
      archived_at: null,
      is_overdue: false,
    };

    // 4. 插入数据库
    const eventId = await this.dao.event.insertOne(event);

    // 5. 如果指定了审批模板，触发审批
    if (eventData.approval_template_id) {
      // 由 approval-service 处理，这里返回事件ID让上层继续
      event._pending_approval_template_id = eventData.approval_template_id;
    }

    // 6. 审计日志
    await this.dao.auditLog.append({
      org_id: orgId,
      category: 'OPERATION',
      actor_id: accountId,
      action: 'EVENT_CREATE',
      target_type: 'event',
      target_id: eventId,
    });

    return { event_id: eventId, event_no: eventNo };
  }

  /**
   * 提交审批（从 DRAFT → PENDING_APPROVAL）
   */
  async submitForApproval(accountId, orgId, eventId, templateId) {
    const event = await this.dao.event.findById(eventId);
    if (!event) throw new BizError(ERROR_CODES.EVENT_NOT_FOUND, '事件不存在');
    if (event.initiator_id !== accountId) {
      throw new BizError(ERROR_CODES.FORBIDDEN, '仅发起人可提交审批');
    }
    if (event.status !== EVENT_STATUS.DRAFT) {
      throw new BizError(ERROR_CODES.EVENT_STATUS_INVALID, '仅草稿状态可提交审批');
    }

    // 状态流转
    await this.dao.event.updateById(eventId, {
      status: EVENT_STATUS.PENDING_APPROVAL,
      submitted_at: nowISO(),
      status_history: [...event.status_history, {
        from: EVENT_STATUS.DRAFT,
        to: EVENT_STATUS.PENDING_APPROVAL,
        actor_id: accountId,
        action: 'SUBMIT',
        at: nowISO(),
      }],
    });

    return { event_id: eventId, status: EVENT_STATUS.PENDING_APPROVAL };
  }

  /**
   * 获取事件详情
   */
  async getDetail(eventId, accountId) {
    const event = await this.dao.event.findById(eventId);
    if (!event) throw new BizError(ERROR_CODES.EVENT_NOT_FOUND, '事件不存在');

    // 获取附件列表
    const attachments = await this.dao.attachment.findByEvent(eventId);

    // 获取处理动作
    const actions = await this.dao.processAction.findByEvent(eventId);

    return { ...event, attachments, process_actions: actions };
  }

  /**
   * 事件列表（按组织）
   */
  async listByOrg(orgId, query, options) {
    const { page, size } = normalizePagination(options);
    return this.dao.event.findByOrgPaged(orgId, query, { page, size, sort: { created_at: -1 } });
  }

  /**
   * 我发起的事件
   */
  async listByInitiator(accountId, query, options) {
    const { page, size } = normalizePagination(options);
    return this.dao.event.findByInitiator(accountId, query, { page, size, sort: { created_at: -1 } });
  }

  /**
   * 撤回事件
   */
  async withdraw(accountId, eventId) {
    const event = await this.dao.event.findById(eventId);
    if (!event) throw new BizError(ERROR_CODES.EVENT_NOT_FOUND, '事件不存在');
    if (event.initiator_id !== accountId) {
      throw new BizError(ERROR_CODES.FORBIDDEN, '仅发起人可撤回');
    }
    if (![EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING_APPROVAL].includes(event.status)) {
      throw new BizError(ERROR_CODES.EVENT_CANNOT_WITHDRAW, '当前状态不可撤回');
    }

    await this.dao.event.updateById(eventId, {
      status: EVENT_STATUS.WITHDRAWN,
      status_history: [...event.status_history, {
        from: event.status,
        to: EVENT_STATUS.WITHDRAWN,
        actor_id: accountId,
        action: 'WITHDRAW',
        at: nowISO(),
      }],
    });

    // 审计
    await this.dao.auditLog.append({
      org_id: event.org_id,
      category: 'STATE',
      actor_id: accountId,
      action: 'EVENT_WITHDRAW',
      target_type: 'event',
      target_id: eventId,
    });

    return { event_id: eventId, status: EVENT_STATUS.WITHDRAWN };
  }

  /**
   * 事件处理动作（评论/指派/完成等）
   */
  async processAction(accountId, eventId, actionType, payload) {
    const event = await this.dao.event.findById(eventId);
    if (!event) throw new BizError(ERROR_CODES.EVENT_NOT_FOUND, '事件不存在');

    const action = {
      event_id: eventId,
      actor_id: accountId,
      action_type: actionType,
      payload: payload || {},
      notify_strategy: 'SILENT',
      at: nowISO(),
    };

    await this.dao.processAction.insertOne(action);

    // 如果是 COMPLETE 动作，更新事件状态
    if (actionType === 'COMPLETE') {
      await this.dao.event.updateById(eventId, {
        status: EVENT_STATUS.COMPLETED,
        completed_at: nowISO(),
        status_history: [...event.status_history, {
          from: event.status,
          to: EVENT_STATUS.COMPLETED,
          actor_id: accountId,
          action: 'COMPLETE',
          at: nowISO(),
        }],
      });
    }

    return { ok: true };
  }

  /**
   * 自动分类（关键词匹配）
   * @private
   */
  async _predictCategory(title, description, eventType) {
    // 事件类型到默认分类的映射
    const typeCategoryMap = {
      MATERIAL_IN: { category_id: 'material_in', path: ['甲供材', '入库'] },
      MATERIAL_OUT: { category_id: 'material_out', path: ['甲供材', '出库'] },
      MATERIAL_TRANSFER: { category_id: 'material_borrow', path: ['甲供材', '转借'] },
      MATERIAL_RETURN: { category_id: 'material_return', path: ['甲供材', '归还'] },
    };

    if (typeCategoryMap[eventType]) {
      return typeCategoryMap[eventType];
    }

    // 关键词匹配
    const text = `${title} ${description}`.toLowerCase();
    const rules = [
      { keywords: ['安全', '攻击', '漏洞', '入侵'], category_id: 'security', path: ['安全事件'] },
      { keywords: ['操作', '变更', '配置', '部署'], category_id: 'operation', path: ['操作记录'] },
      { keywords: ['合规', '审计', '备案', '等保'], category_id: 'compliance', path: ['合规备案'] },
      { keywords: ['故障', '中断', '恢复', '应急'], category_id: 'incident', path: ['故障记录'] },
      { keywords: ['会议', '纪要', '讨论', '决议'], category_id: 'meeting', path: ['会议纪要'] },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return { category_id: rule.category_id, path: rule.path };
      }
    }

    return { category_id: 'other', path: ['其他'] };
  }
}

module.exports = EventService;
