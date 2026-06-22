import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user/user.entity'
import { UserRole } from './user/user-role.entity'
import { Role } from './role/role.entity'
import { RolePermission } from './role/role-permission.entity'
import { Permission } from './permission/permission.entity'
import { Menu } from './menu/menu.entity'
import { AgentManifest } from './agent/agent-manifest.entity'
import { AuditLog } from './audit/audit-log.entity'
import { UserService } from './user/user.service'
import { UserController } from './user/user.controller'
import { RoleService } from './role/role.service'
import { RoleController } from './role/role.controller'
import { PermissionService } from './permission/permission.service'
import { PermissionController } from './permission/permission.controller'
import { MenuService } from './menu/menu.service'
import { MenuController } from './menu/menu.controller'
import { AgentManifestService } from './agent/agent-manifest.service'
import { AgentManifestController } from './agent/agent-manifest.controller'
import { AuditLogService } from './audit/audit-log.service'
import { AuditLogController } from './audit/audit-log.controller'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'
import { VersionController } from './version.controller'
import { LlmConfigController } from './llm-config.controller'
import { EntitySyncService } from './entity-sync.service'
import { WizardController } from './wizard.controller'
import { WizardService } from './wizard.service'
import { WizardGuard } from '../../common/guards/wizard.guard'

// 🔑 从 Core 包引入 ModelKey 体系（启动时从 DB 解密加载 Key 到 process.env）
import { ModelKey } from '@openoba/core/dist/modules/system/model-key.entity'
import { ModelKeyModels } from '@openoba/core/dist/modules/system/model-key-models.entity'
import { ModelRegistry } from '@openoba/core/dist/modules/system/model-registry.entity'
import { ModelProvider } from '@openoba/core/dist/modules/system/model-provider.entity'
import { TokenUsage } from '@openoba/core/dist/modules/system/token-usage.entity'
import { ModelConnectionLog } from '@openoba/core/dist/modules/system/model-connection-log.entity'
import { ModelRegistryService } from '@openoba/core/dist/modules/system/model-registry.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      Role,
      RolePermission,
      Permission,
      Menu,
      AgentManifest,
      AuditLog,
      ModelKey,
      ModelKeyModels,
      ModelRegistry,
      ModelProvider,
      TokenUsage,
      ModelConnectionLog,
    ]),
  ],
  providers: [
    UserService,
    RoleService,
    PermissionService,
    MenuService,
    AgentManifestService,
    AuditLogService,
    DeploymentService,
    EntitySyncService,
    WizardService,
    ModelRegistryService,
  ],
  controllers: [
    UserController,
    RoleController,
    PermissionController,
    MenuController,
    AgentManifestController,
    AuditLogController,
    DeploymentController,
    VersionController,
    LlmConfigController,
    WizardController,
  ],
  exports: [
    UserService,
    RoleService,
    PermissionService,
    MenuService,
    AgentManifestService,
    AuditLogService,
    DeploymentService,
    EntitySyncService,
    ModelRegistryService,
    TypeOrmModule,
  ],
})
export class SystemModule {}
