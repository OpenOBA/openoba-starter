import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user/user.entity'
import { Role } from './role/role.entity'
import { Permission } from './permission/permission.entity'
import { Menu } from './menu/menu.entity'
import { AgentManifest } from './agent/agent-manifest.entity'
import { AuditLog } from './audit/audit-log.entity'
import { ModelProvider } from './model-provider.entity'
import { ModelRegistry } from './model-registry.entity'
import { TokenUsage } from './token-usage.entity'
import { ModelConnectionLog } from './model-connection-log.entity'
import { ModelKey } from './model-key.entity'
import { ModelKeyModels } from './model-key-models.entity'
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
import { MigrationRunner } from './migration-runner'
import { VersionController } from './version.controller'
import { LlmConfigController } from './llm-config.controller'
import { EntitySyncService } from './entity-sync.service'
import { WizardController } from './wizard.controller'
import { WizardService } from './wizard.service'
import { ModelRegistryService } from './model-registry.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Menu,
      AgentManifest,
      AuditLog,
      ModelProvider,
      ModelRegistry,
      ModelKey,
      ModelKeyModels,
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
    MigrationRunner,
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
    MigrationRunner,
    EntitySyncService,
    ModelRegistryService,
    TypeOrmModule,
  ],
})
export class SystemModule {}
