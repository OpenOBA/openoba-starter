"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTaskController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const agent_task_service_1 = require("./agent-task.service");
const agent_task_dto_1 = require("./dto/agent-task.dto");
let AgentTaskController = class AgentTaskController {
    constructor(service) {
        this.service = service;
    }
    async create(dto, req) {
        const username = req?.user?.username || 'admin'
        return this.service.create(dto, username);
    }
    async query(q) {
        return this.service.query(q);
    }
    async getStats(reportTo) {
        return this.service.getStats(reportTo);
    }
    async getPendingApprovals(reportTo) {
        return this.service.getPendingApprovals(reportTo);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async getLogs(id) {
        return this.service.getLogs(id);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async submitReport(id, dto) {
        return this.service.submitReport({ ...dto, taskId: id });
    }
    async approve(id, dto) {
        return this.service.approve({ ...dto, taskId: id });
    }
    async deliver(id, dto) {
        return this.service.deliver({ ...dto, taskId: id });
    }
    async publish(id) {
        return this.service.publish(id);
    }
    async complete(id) {
        return this.service.complete(id);
    }
    async handleError(id, body) {
        return this.service.handleError(id, body.errorInfo);
    }
    async escalate(id, dto) {
        return this.service.escalate({ ...dto, taskId: id });
    }
    async resume(id) {
        return this.service.resumeFromEscalated(id);
    }
    async cancel(id) {
        return this.service.cancel(id);
    }
    async abort(id) {
        return this.service.abort(id);
    }
    async delete(id) {
        return this.service.delete(id);
    }
    async checkEscalations() {
        const count = await this.service.checkEscalationDeadlines();
        return { escalated: count };
    }
};
exports.AgentTaskController = AgentTaskController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '创建任务（老板指派 Agent 执行）' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agent_task_dto_1.CreateAgentTaskDto, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '任务列表（分页+筛选+搜索）' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'reportTo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'agentId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: '搜索任务编号或标题' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'pageSize', required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agent_task_dto_1.QueryAgentTaskDto]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "query", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: '任务统计（待审批/执行中/已完成/已升级）' }),
    (0, swagger_1.ApiQuery)({ name: 'reportTo', required: false, description: '按审批人筛选' }),
    __param(0, (0, common_1.Query)('reportTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('pending/:report-to'),
    (0, swagger_1.ApiOperation)({ summary: '获取某审批人的待处理任务' }),
    __param(0, (0, common_1.Param)('report-to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "getPendingApprovals", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '任务详情' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/logs'),
    (0, swagger_1.ApiOperation)({ summary: '任务日志（完整认知日志）' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '编辑任务（仅 drafted 状态）' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, agent_task_dto_1.UpdateAgentTaskDto]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    (0, swagger_1.ApiOperation)({ summary: 'Agent 提交 Task Report → 状态 drafted/revised → proposed' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "submitReport", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: '审批任务 → proposed → executing / revised' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/deliver'),
    (0, swagger_1.ApiOperation)({ summary: 'Agent 交付 → executing → delivered' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "deliver", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, swagger_1.ApiOperation)({ summary: '人工发布 → delivered → published' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, swagger_1.ApiOperation)({ summary: '验收完成 → published → completed' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/error'),
    (0, swagger_1.ApiOperation)({ summary: 'Agent 报错 → 自动重试或升级' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "handleError", null);
__decorate([
    (0, common_1.Post)(':id/escalate'),
    (0, swagger_1.ApiOperation)({ summary: '手动升级任务' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "escalate", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    (0, swagger_1.ApiOperation)({ summary: '从 escalated 恢复执行' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: '取消任务（记录保留）' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/abort'),
    (0, swagger_1.ApiOperation)({ summary: '中止任务（异常中断，记录保留）' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "abort", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '删除任务（任何状态均可，同步清理日志）' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('check-escalations'),
    (0, swagger_1.ApiOperation)({ summary: '手动触发超时检查（也可用 cron 自动执行）' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentTaskController.prototype, "checkEscalations", null);
exports.AgentTaskController = AgentTaskController = __decorate([
    (0, swagger_1.ApiTags)('ER-OS · 任务工作流引擎'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)('super_admin', 'admin', 'operator'),
    (0, common_1.Controller)('eros/tasks'),
    __metadata("design:paramtypes", [agent_task_service_1.AgentTaskService])
], AgentTaskController);
//# sourceMappingURL=agent-task.controller.js.map