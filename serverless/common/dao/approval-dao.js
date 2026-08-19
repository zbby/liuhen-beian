/**
 * common/dao/approval-dao.js
 * 审批数据访问
 */

const BaseDao = require('./base-dao');

class ApprovalTemplateDao extends BaseDao {
  constructor(db) {
    super(db, 'apr_templates');
  }

  async findByOrg(orgId, status = 'ACTIVE') {
    return this.find(
      { $or: [{ org_id: orgId }, { org_id: null }], status },
      { sort: { priority: 1 } }
    );
  }

  async findByBizType(orgId, bizType) {
    return this.find(
      {
        $or: [{ org_id: orgId }, { org_id: null }],
        biz_types: bizType,
        status: 'ACTIVE',
      },
      { sort: { priority: 1 } }
    );
  }
}

class ApprovalFlowDao extends BaseDao {
  constructor(db) {
    super(db, 'apr_flows');
  }

  async findByEvent(eventId) {
    return this.findOne({ event_id: eventId });
  }

  async findByOrgPaged(orgId, query = {}, options = {}) {
    return this.findPage({ org_id: orgId, ...query }, options);
  }
}

class ApprovalStepDao extends BaseDao {
  constructor(db) {
    super(db, 'apr_steps');
  }

  async findByFlow(flowId) {
    return this.find({ flow_id: flowId }, { sort: { step_no: 1 } });
  }

  async findByFlowAndStep(flowId, stepNo) {
    return this.findOne({ flow_id: flowId, step_no: stepNo });
  }

  /**
   * 查找待我审批的节点
   */
  async findPendingByUser(userId) {
    return this.find({
      candidate_user_ids: userId,
      status: 'ACTIVE',
    });
  }

  /**
   * 记录审批动作
   */
  async recordAction(stepId, signatureEntry) {
    const step = await this.findById(stepId);
    if (!step) return null;

    const signatures = step.signatures || [];
    signatures.push(signatureEntry);

    return this.updateById(stepId, { signatures });
  }
}

class DelegationDao extends BaseDao {
  constructor(db) {
    super(db, 'apr_delegations');
  }

  async findActiveByDelegator(delegatorId, now) {
    return this.find({
      delegator_id: delegatorId,
      start_at: { $lte: now },
      end_at: { $gte: now },
    });
  }
}

module.exports = {
  ApprovalTemplateDao,
  ApprovalFlowDao,
  ApprovalStepDao,
  DelegationDao,
};
