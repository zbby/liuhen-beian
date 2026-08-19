/**
 * common/services/index.js
 * Service 层统一导出 + 工厂函数
 * 
 * 用法：
 *   const createDao = require('../common/dao');
 *   const createServices = require('../common/services');
 *   const dao = createDao(db);
 *   const services = createServices(dao);
 */

const AuthService = require('./auth-service');
const EventService = require('./event-service');
const ApprovalService = require('./approval-service');
const MaterialService = require('./material-service');
const NotifyService = require('./notify-service');
const OrgService = require('./org-service');

module.exports = function createServiceContext(dao) {
  return {
    auth: new AuthService(dao),
    event: new EventService(dao),
    approval: new ApprovalService(dao),
    material: new MaterialService(dao),
    notify: new NotifyService(dao),
    org: new OrgService(dao),
  };
};
