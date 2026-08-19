/**
 * common/services/approval-service.js
 * 审批服务 — 模板管理、审批流实例化、审批动作、加签、超时处理
 */

const { BizError, ERROR_CODES, nowISO, requireFields } = require('../utils/helper');
const {
  APPROVAL_FLOW_STATUS,
  APPROVAL_STEP_STATUS,
  APPROVAL_MODE,
  NODE_TYPE,
} = require('../utils/constants');

class ApprovalService {
  constructor(dao) {
    this.dao = dao;
  }

  /**
   * 获取审批模板列表
   */
  async getTemplates(orgId, eventType) {
    if (eventType) {
      return this.dao.approvalTemplate.findByBizType(orgId, eventType);
    }
    return this.dao.approvalTemplate.findByOrg(orgId);
  }

  /**
   * 实例化审批流（事件提交审批时调用）
   * @param {string} orgId
   * @param {string} eventId
   * @param {string} templateId
   * @param {string} initiatorId
   * @returns {object}  { flow_id, steps }
   */
  async createFlow(orgId, eventId, templateId, initiatorId) {
    const template = await this.dao.approvalTemplate.findById(templateId);
    if (!template) {
      throw new BizError(ERROR_CODES.APPROVAL_TEMPLATE_NOT_FOUND, '审批模板不存在');
    }

    // 1. 创建审批流实例
    const flowId = await this.dao.approvalFlow.insertOne({
      event_id: eventId,
      org_id: orgId,
      template_id: templateId,
      template_version: template.version || 1,
      template_snapshot: template,
      status: APPROVAL_FLOW_STATUS.PENDING,
      current_step_no: 0,
      initiator_id: initiatorId,
      started_at: nowISO(),
      finished_at: null,
    });

    // 2. 根据模板创建审批步骤实例
    const steps = template.steps || [];
    let firstActiveStep = null;

    for (let i = 0; i < steps.length; i++) {
      const stepDef = steps[i];
      const stepDoc = {
        flow_id: flowId,
        step_no: i + 1,
        parallel_group: stepDef.parallel_group || 0,
        node_snapshot: stepDef,
        candidate_user_ids: stepDef.assignment?.preset_user_ids || [],
        actual_approver_ids: [],
        mode: stepDef.mode || APPROVAL_MODE.COUNTERSIGN,
        status: i === 0 ? APPROVAL_STEP_STATUS.ACTIVE : APPROVAL_STEP_STATUS.PENDING,
        signatures: [],
        is_added_by_initiator: false,
        is_added_by_approver: false,
        timeout_at: stepDef.timeout_hours
          ? new Date(Date.now() + stepDef.timeout_hours * 3600000).toISOString()
          : null,
        timeout_action: stepDef.timeout_action || null,
        started_at: i === 0 ? nowISO() : null,
        finished_at: null,
      };

      await this.dao.approvalStep.insertOne(stepDoc);
      if (i === 0) firstActiveStep = stepDoc;
    }

    // 3. 更新审批流状态为 ACTIVE
    await this.dao.approvalFlow.updateById(flowId, {
      status: APPROVAL_FLOW_STATUS.ACTIVE,
      current_step_no: 1,
    });

    // 4. 更新事件的 approval_flow_id
    await this.dao.event.updateById(eventId, {
      approval_flow_id: flowId,
    });

    return { flow_id: flowId, current_step: 1 };
  }

  /**
   * 审批动作（APPROVE / REJECT）
   */
  async act(accountId, flowId, action, comment, extra = {}) {
    requireFields({ action }, ['action']);
    if (!['APPROVE', 'REJECT'].includes(action)) {
      throw new BizError(ERROR_CODES.INVALID_PARAM, 'action 必须为 APPROVE 或 REJECT');
    }

    const flow = await this.dao.approvalFlow.findById(flowId);
    if (!flow) throw new BizError(ERROR_CODES.APPROVAL_NOT_FOUND, '审批流不存在');
    if (flow.status !== APPROVAL_FLOW_STATUS.ACTIVE) {
      throw new BizError(ERROR_CODES.APPROVAL_ALREADY_PROCESSED, '审批流非活动状态');
    }

    // 获取当前步骤
    const steps = await this.dao.approvalStep.findByFlow(flowId);
    const currentStep = steps.find((s) => s.status === APPROVAL_STEP_STATUS.ACTIVE);
    if (!currentStep) {
      throw new BizError(ERROR_CODES.APPROVAL_ALREADY_PROCESSED, '没有待处理的审批步骤');
    }

    // 权限校验：当前用户必须在候选人列表中
    if (!currentStep.candidate_user_ids.includes(accountId)) {
      throw new BizError(ERROR_CODES.APPROVAL_NOT_AUTHORIZED, '您无权审批此步骤');
    }

    // 记录审批签名
    const signatureEntry = {
      user_id: accountId,
      action,
      comment: comment || '',
      signature_url: extra.signature_url || null,
      ip: extra.ip || '',
      ua: extra.ua || '',
      at: nowISO(),
    };
    await this.dao.approvalStep.recordAction(currentStep._id, signatureEntry);

    // 更新 actual_approver_ids
    const approverIds = [...new Set([...currentStep.actual_approver_ids, accountId])];
    await this.dao.approvalStep.updateById(currentStep._id, {
      actual_approver_ids: approverIds,
    });

    // 判断步骤是否完成
    const isStepDone = this._checkStepCompletion(currentStep, action);

    if (isStepDone) {
      const stepStatus = action === 'APPROVE' ? APPROVAL_STEP_STATUS.APPROVED : APPROVAL_STEP_STATUS.REJECTED;
      await this.dao.approvalStep.updateById(currentStep._id, {
        status: stepStatus,
        finished_at: nowISO(),
      });

      if (action === 'REJECT') {
        // 整个审批流 REJECTED
        await this.dao.approvalFlow.updateById(flowId, {
          status: APPROVAL_FLOW_STATUS.REJECTED,
          finished_at: nowISO(),
        });
        // 更新事件状态
        await this._updateEventStatus(flow.event_id, 'REJECTED', accountId);
        return { flow_id: flowId, status: APPROVAL_FLOW_STATUS.REJECTED };
      }

      // 检查是否有下一步
      const nextStepNo = currentStep.step_no + 1;
      const nextStep = steps.find((s) => s.step_no === nextStepNo);

      if (nextStep) {
        // 激活下一步
        await this.dao.approvalStep.updateById(nextStep._id, {
          status: APPROVAL_STEP_STATUS.ACTIVE,
          started_at: nowISO(),
        });
        await this.dao.approvalFlow.updateById(flowId, {
          current_step_no: nextStepNo,
        });
        return { flow_id: flowId, current_step: nextStepNo };
      }

      // 所有步骤都通过了 → 审批流 APPROVED
      await this.dao.approvalFlow.updateById(flowId, {
        status: APPROVAL_FLOW_STATUS.APPROVED,
        finished_at: nowISO(),
      });
      await this._updateEventStatus(flow.event_id, 'PROCESSING', accountId);
      return { flow_id: flowId, status: APPROVAL_FLOW_STATUS.APPROVED };
    }

    // 步骤未完成（会签模式下还有人未审批）
    return { flow_id: flowId, step_status: 'PENDING_MORE_SIGNATURES' };
  }

  /**
   * 加签
   */
  async addCounterSigner(accountId, flowId, targetUserIds) {
    const flow = await this.dao.approvalFlow.findById(flowId);
    if (!flow) throw new BizError(ERROR_CODES.APPROVAL_NOT_FOUND, '审批流不存在');

    const steps = await this.dao.approvalStep.findByFlow(flowId);
    const currentStep = steps.find((s) => s.status === APPROVAL_STEP_STATUS.ACTIVE);

    if (!currentStep) {
      throw new BizError(ERROR_CODES.APPROVAL_ALREADY_PROCESSED, '没有活动步骤');
    }

    if (!currentStep.node_snapshot?.is_dynamic_insertable) {
      throw new BizError(ERROR_CODES.FORBIDDEN, '当前步骤不允许加签');
    }

    // 加入候选人
    const candidateIds = [...new Set([...currentStep.candidate_user_ids, ...targetUserIds])];
    await this.dao.approvalStep.updateById(currentStep._id, {
      candidate_user_ids: candidateIds,
      is_added_by_approver: true,
    });

    // 审计
    await this.dao.auditLog.append({
      org_id: flow.org_id,
      category: 'OPERATION',
      actor_id: accountId,
      action: 'ADD_COUNTER_SIGNER',
      target_type: 'approval_step',
      target_id: currentStep._id,
      detail: { added_user_ids: targetUserIds },
    });

    return { ok: true };
  }

  /**
   * 我的待办
   */
  async getPendingByUser(accountId, options = {}) {
    const { page = 1, size = 20 } = options;
    // 查找 candidate_user_ids 包含当前用户且状态 ACTIVE 的步骤
    const steps = await this.dao.approvalStep.find({
      candidate_user_ids: accountId,
      status: APPROVAL_STEP_STATUS.ACTIVE,
    });

    // 获取对应的审批流与事件信息
    const results = [];
    for (const step of steps) {
      const flow = await this.dao.approvalFlow.findById(step.flow_id);
      if (!flow) continue;
      const event = await this.dao.event.findById(flow.event_id);
      results.push({
        flow_id: step.flow_id,
        step_no: step.step_no,
        event_id: flow.event_id,
        event_title: event?.title,
        event_no: event?.event_no,
        event_type: event?.event_type,
        submitted_at: event?.submitted_at,
      });
    }

    // 分页
    const total = results.length;
    const start = (page - 1) * size;
    const list = results.slice(start, start + size);

    return { list, total, page, size };
  }

  // ===== 内部方法 =====

  /**
   * 检查步骤是否完成
   */
  _checkStepCompletion(step, action) {
    if (step.mode === APPROVAL_MODE.ANY_SIGN) {
      // 或签：任一人操作即完成
      return true;
    }
    if (step.mode === APPROVAL_MODE.NOTIFY_ONLY) {
      // 仅知会：始终完成
      return true;
    }
    // 会签：所有候选人都已签名
    const signedUserIds = (step.signatures || []).map((s) => s.user_id);
    return step.candidate_user_ids.every((uid) => signedUserIds.includes(uid));
  }

  /**
   * 更新事件状态（审批结果反馈）
   */
  async _updateEventStatus(eventId, newStatus, actorId) {
    const event = await this.dao.event.findById(eventId);
    if (!event) return;

    await this.dao.event.updateById(eventId, {
      status: newStatus,
      completed_at: newStatus === 'COMPLETED' ? nowISO() : event.completed_at,
      status_history: [...event.status_history, {
        from: event.status,
        to: newStatus,
        actor_id: actorId,
        action: `APPROVAL_${newStatus}`,
        at: nowISO(),
      }],
    });
  }
}

module.exports = ApprovalService;
