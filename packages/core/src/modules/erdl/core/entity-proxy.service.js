"use strict";
/**
 * 秒镜科技 · ERDL V1.3 — Entity Proxy Service
 *
 * @file ERDL 实体代理引擎：Agent 操作语义 Entity → 翻译为 SQL → 执行
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-11
 * @license AGPL-3.0
 *
 * 核心理念：
 *   Agent 不需要知道数据库物理结构。
 *   Agent 用语义字段名操作 Entity，Entity Proxy 负责翻译。
 *   翻译链条：语义字段名 → dbColumn → SQL INSERT/UPDATE/DELETE/SELECT
 */
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
var EntityProxyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityProxyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const erdl_registry_1 = require("./erdl-registry");
// ============================================
// ERDL Entity Proxy Service
// ============================================
let EntityProxyService = EntityProxyService_1 = class EntityProxyService {
    constructor(registry, dataSource) {
        this.registry = registry;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(EntityProxyService_1.name);
        /** 字段映射缓存：{ namespace.entityName → EntityMapping } */
        this.mappings = new Map();
    }
    /**
     * 构建/刷新字段映射（在 .erdl 热加载后调用）
     */
    refreshMappings(namespace) {
        const entities = this.registry.getAllEntities();
        for (const entity of entities) {
            if (entity.namespace !== namespace)
                continue;
            this.buildMapping(entity);
        }
        this.logger.log(`[EntityProxy] Mappings refreshed for ${namespace}: ${this.mappings.size} entities`);
    }
    /** P0修复：在事务中执行回调，用于 Agent 写操作原子性 */
    async withTransaction(fn) {
        if (!this.dataSource)
            throw new Error('Database not available');
        return this.dataSource.transaction(fn);
    }
    /** 获取 DataSource（用于事务内直接 query） */
    getDataSource() {
        return this.dataSource;
    }
    /**
     * 为单个 Entity 构建字段映射
     */
    buildMapping(entity) {
        const key = `${entity.namespace}.${entity.name}`;
        const tableName = entity.table || entity.name;
        const primaryKey = entity.primaryKey || 'id';
        // 安全校验：表名和主键列名必须符合标识符规范
        this.validateSqlIdentifier(tableName);
        this.validateSqlIdentifier(primaryKey);
        const fields = new Map();
        const dbToSemantic = new Map();
        for (const [fieldName, raw] of Object.entries(entity.properties)) {
            const prop = typeof raw === 'string' ? { type: raw } : raw;
            const dbColumn = prop.dbColumn || fieldName;
            // 安全校验：物理列名必须符合标识符规范
            this.validateSqlIdentifier(dbColumn);
            const def = {
                fieldName,
                dbColumn,
                type: prop.type || 'String',
                required: !!prop.required,
                isEnum: !!prop.enum,
                enumValues: Array.isArray(prop.enum) ? prop.enum : [],
                maxLength: prop.maxLength,
                isJSON: prop.type === 'JSON' || prop.type === 'json',
            };
            fields.set(fieldName, def);
            dbToSemantic.set(dbColumn, fieldName);
        }
        this.mappings.set(key, {
            table: tableName,
            primaryKey,
            fields,
            dbToSemantic,
        });
        this.logger.log(`[EntityProxy] Mapped: ${key} → ${tableName} (${fields.size} fields)`);
    }
    /**
     * 获取 Entity 映射（带缓存）
     */
    getMapping(namespace, entityName) {
        const key = `${namespace}.${entityName}`;
        let mapping = this.mappings.get(key);
        if (!mapping) {
            // 尝试延迟构建
            const entity = this.registry.getEntity(namespace, entityName);
            if (!entity)
                return null;
            this.buildMapping(entity);
            mapping = this.mappings.get(key);
        }
        return mapping || null;
    }
    // ═══════════════════════════════════════════
    // 核心查询 API
    // ═══════════════════════════════════════════
    /**
     * 语义 SELECT
     *
     * @param namespace 命名空间
     * @param entityName Entity 名称
     * @param select 需要返回的语义字段列表（空=全字段）
     * @param where 语义条件 { tierLevel: "VIP" }
     * @param limit 行数限制
     * @param offset 偏移
     */
    async query(params) {
        const mapping = this.getMapping(params.namespace, params.entity);
        if (!mapping)
            return { success: false, rows: [], count: 0, error: `未知实体: ${params.entity}` };
        try {
            // 构建 SELECT 列
            let columns = '*';
            if (params.select && params.select.length > 0) {
                const dbCols = [];
                for (const s of params.select) {
                    const def = mapping.fields.get(s);
                    if (def)
                        dbCols.push(`\`${def.dbColumn}\``);
                }
                if (dbCols.length > 0)
                    columns = dbCols.join(', ');
            }
            // 构建 WHERE
            const whereParts = [];
            const values = [];
            if (params.where) {
                for (const [key, val] of Object.entries(params.where)) {
                    // 解析别名 → 可能已经是别名或语义字段名
                    const resolved = this.registry.resolveAlias(params.namespace, params.entity, key);
                    const def = mapping.fields.get(resolved);
                    if (def) {
                        whereParts.push(`\`${def.dbColumn}\` = ?`);
                        values.push(val);
                    }
                    else {
                        // P0修复：不存在于映射中的字段拒绝查询，防止任意列名注入
                        throw new common_1.BadRequestException(`WHERE key "${key}" 不在 ${params.entity} 的已知字段中（语义名: ${resolved || 'unknown'}）`);
                    }
                }
            }
            // P0-1修复：运行时强校验 limit/offset，防止SQL注入（即使ValidationPipe被绕过）
            const safeLimit = typeof params.limit === 'number' && Number.isFinite(params.limit) && params.limit > 0
                ? Math.min(Math.floor(params.limit), 1000)
                : 100;
            const safeOffset = typeof params.offset === 'number' && Number.isFinite(params.offset) && params.offset >= 0
                ? Math.floor(params.offset)
                : 0;
            const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
            const limitClause = `LIMIT ${safeLimit}`;
            const offsetClause = safeOffset > 0 ? `OFFSET ${safeOffset}` : '';
            const sql = `SELECT ${columns} FROM \`${mapping.table}\` ${whereClause} ${limitClause} ${offsetClause}`;
            this.logger.log(`[EntityProxy] QUERY: ${sql}`);
            if (!this.dataSource) {
                return { success: true, rows: [], count: 0, sql, error: 'No database connection (preview mode)' };
            }
            const rows = await this.dataSource.query(columns === '*' ? sql : sql, values);
            // P1-3修复：敏感字段过滤（阻止通过ERDL Proxy泄露隐私数据）
            if (params.entity === 'Customer') {
                const sensitiveFields = new Set(['phone', 'email', 'wechat', 'password', 'pin']);
                for (const row of rows) {
                    for (const field of sensitiveFields) {
                        delete row[field];
                    }
                }
            }
            return { success: true, rows, count: rows.length, sql };
        }
        catch (e) {
            return { success: false, rows: [], count: 0, error: e.message };
        }
    }
    /**
     * 语义 INSERT
     *
     * @param namespace 命名空间
     * @param entityName Entity 名称
     * @param data 语义数据 { spuCode: "SPU-001", spuName: "经典圆框" }
     */
    async insert(params) {
        const mapping = this.getMapping(params.namespace, params.entity);
        if (!mapping)
            return { success: false, error: `未知实体: ${params.entity}` };
        try {
            // 翻译：语义字段名 → 数据库列名
            const cols = [];
            const phs = [];
            const values = [];
            // 自动生成 UUID 主键（如果未提供）
            const dataWithId = { ...params.data };
            const pkField = mapping.fields.get(mapping.primaryKey);
            if (pkField && !dataWithId[mapping.primaryKey] && !dataWithId[pkField.fieldName]) {
                const uuid = require('crypto').randomUUID().replace(/-/g, '');
                dataWithId[pkField.fieldName] = uuid;
            }
            for (const [key, val] of Object.entries(dataWithId)) {
                const resolved = this.registry.resolveAlias(params.namespace, params.entity, key);
                const def = mapping.fields.get(resolved);
                // 字段名校验：不存在的字段 → 返回明确错误
                if (!def) {
                    const available = Array.from(mapping.fields.keys()).slice(0, 10).join(', ');
                    return { success: false, error: `未知字段: "${key}"。${params.entity} 可用字段: ${available}` };
                }
                const dbCol = def.dbColumn || key;
                cols.push(`\`${dbCol}\``);
                phs.push('?');
                // JSON 列自动序列化（含校验：无效JSON自动修复）
                if (def?.isJSON && val !== null && val !== undefined) {
                    if (typeof val === 'string') {
                        // 验证是否为合法 JSON，不是则安全序列化
                        try {
                            JSON.parse(val);
                        }
                        catch {
                            values.push(JSON.stringify(val));
                            continue;
                        }
                        values.push(val);
                    }
                    else {
                        values.push(JSON.stringify(val));
                    }
                }
                else {
                    values.push(val);
                }
            }
            const sql = `INSERT INTO \`${mapping.table}\` (${cols.join(', ')}) VALUES (${phs.join(', ')})`;
            this.logger.log(`[EntityProxy] INSERT: ${sql}`);
            if (!this.dataSource) {
                return { success: true, sql, error: 'No database connection (preview mode)' };
            }
            const r = await this.dataSource.query(sql, values);
            return { success: true, affectedRows: r.affectedRows || 1, sql };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    /**
     * 语义 UPDATE
     *
     * @param namespace 命名空间
     * @param entityName Entity 名称
     * @param data 语义更新数据 { spuName: "新名" }
     * @param where 语义条件 { spuCode: "SPU-001" }
     */
    async update(params) {
        const mapping = this.getMapping(params.namespace, params.entity);
        if (!mapping)
            return { success: false, error: `未知实体: ${params.entity}` };
        if (!params.where || Object.keys(params.where).length === 0)
            return { success: false, error: 'update 必须带 where' };
        try {
            const values = [];
            const setParts = [];
            for (const [key, val] of Object.entries(params.data)) {
                const resolved = this.registry.resolveAlias(params.namespace, params.entity, key);
                const def = mapping.fields.get(resolved);
                if (!def) {
                    const available = Array.from(mapping.fields.keys()).slice(0, 10).join(', ');
                    return { success: false, error: `未知字段: "${key}"。${params.entity} 可用字段: ${available}` };
                }
                const dbCol = def.dbColumn || key;
                setParts.push(`\`${dbCol}\` = ?`);
                // JSON 列自动序列化 + 校验
                if (def.isJSON && typeof val === 'object') {
                    values.push(JSON.stringify(val));
                }
                else if (def.isJSON && typeof val === 'string') {
                    try {
                        JSON.parse(val);
                    }
                    catch {
                        values.push(JSON.stringify(val));
                        continue;
                    }
                    values.push(val);
                }
                else {
                    values.push(val);
                }
            }
            const whereParts = [];
            for (const [key, val] of Object.entries(params.where)) {
                const resolved = this.registry.resolveAlias(params.namespace, params.entity, key);
                const def = mapping.fields.get(resolved);
                // P0修复(C01)：非映射字段拒绝，与query()方法保持一致
                if (!def) {
                    throw new common_1.BadRequestException(`UPDATE WHERE key "${key}" 不在 ${params.entity} 的已知字段中`);
                }
                const dbCol = def.dbColumn;
                whereParts.push(`\`${dbCol}\` = ?`);
                values.push(val);
            }
            const sql = `UPDATE \`${mapping.table}\` SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')} LIMIT 100`;
            this.logger.log(`[EntityProxy] UPDATE: ${sql}`);
            if (!this.dataSource) {
                return { success: true, sql, error: 'No database connection (preview mode)' };
            }
            const r = await this.dataSource.query(sql, values);
            return { success: true, affectedRows: r.affectedRows || r.changedRows || 0, sql };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    /**
     * 语义 DELETE（软删除）
     */
    async softDelete(params) {
        const mapping = this.getMapping(params.namespace, params.entity);
        if (!mapping)
            return { success: false, error: `未知实体: ${params.entity}` };
        if (!params.where || Object.keys(params.where).length === 0)
            return { success: false, error: 'delete 必须带 where' };
        try {
            const whereParts = [];
            const values = [];
            for (const [key, val] of Object.entries(params.where)) {
                const resolved = this.registry.resolveAlias(params.namespace, params.entity, key);
                const def = mapping.fields.get(resolved);
                // P0修复(C01)：非映射字段拒绝
                if (!def) {
                    throw new common_1.BadRequestException(`DELETE WHERE key "${key}" 不在 ${params.entity} 的已知字段中`);
                }
                const dbCol = def.dbColumn;
                whereParts.push(`\`${dbCol}\` = ?`);
                values.push(val);
            }
            const sql = `UPDATE \`${mapping.table}\` SET is_deleted = 1, deleted_at = NOW() WHERE ${whereParts.join(' AND ')} AND is_deleted = 0 LIMIT 100`;
            this.logger.log(`[EntityProxy] SOFT DELETE: ${sql}`);
            if (!this.dataSource) {
                return { success: true, sql, error: 'No database connection (preview mode)' };
            }
            const r = await this.dataSource.query(sql, values);
            return { success: true, affectedRows: r.affectedRows || r.changedRows || 0, sql };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    /**
     * 为 LLM/Agent 构建 Entity 定义提示（含别名映射）
     */
    buildEntityPrompt(namespace) {
        const entities = this.registry.getAllEntities().filter(e => e.namespace === namespace);
        if (entities.length === 0)
            return '';
        // V1.3: 精简模式——只列 Entity 名称 + 关键字段（不列全部字段，降低 Token 消耗）
        const lines = [
            '## ERDL 可用 Entity',
            '',
            '使用 erdl_crud 时，entity 参数必须从下表中选取。字段用语义名（系统自动翻译为数据库列名）。',
            '',
            '| Entity | 用途 | 关键字段 |',
            '|--------|------|---------|',
        ];
        const descriptions = {
            ProductSpu: '商品SPU。命名规则：【秒镜 S{结构编码} · {框型}框{系列}系列 · {性别}】如"秒镜 S5344 · 圆框经典系列 · 女款"',
            ProductSku: '商品SKU。命名规则：【秒镜 S{结构编码} · {肤色效果} · {脸型效果} · {颜色} · {框型}框{系列} · {性别}】如"秒镜 S5344 · 冷白皮显嫩 · 圆脸显瘦 · 马卡龙紫 · 圆框经典系列 · 女款"',
            ProductCategory: '商品分类',
            ProductSet: '商品套装',
            Customer: '客户',
            Order: '订单',
            OrderItem: '订单明细',
            Inventory: '库存（只读，查询用）',
            InventoryDocument: '出入库单据（入库用stock_in，出库用stock_out。创建后系统自动执行，库存自动更新）',
            StructureStandard: '结构标准',
            DictEffectTag: '効果词字典（肤色/脸型效果）',
            DictSkuColor: 'SKU色彩字典',
            KnowledgeEntry: '知识条目',
            DraftSpu: '草稿SPU',
            SubSku: '副品S-SKU',
        };
        for (const entity of entities) {
            const mapping = this.getMapping(namespace, entity.name);
            if (!mapping)
                continue;
            const desc = descriptions[entity.name] || '';
            // 只列出关键字段（前5个）
            const keyFields = [];
            let count = 0;
            for (const [, def] of mapping.fields) {
                if (count >= 5) {
                    keyFields.push('...');
                    break;
                }
                const aliasHint = def.fieldName !== def.dbColumn ? '' : '';
                keyFields.push(`\`${def.fieldName}\``);
                count++;
            }
            lines.push(`| **${entity.name}** | ${desc} | ${keyFields.join(', ')} |`);
        }
        return lines.join('\n');
    }
    /**
     * SQL 标识符安全校验
     * 仅允许字母、数字、下划线，禁止注入
     */
    validateSqlIdentifier(name) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(name)) {
            throw new Error(`Invalid SQL identifier: ${name}`);
        }
    }
};
exports.EntityProxyService = EntityProxyService;
exports.EntityProxyService = EntityProxyService = EntityProxyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(typeorm_1.DataSource)),
    __metadata("design:paramtypes", [erdl_registry_1.ERDLRegistry,
        typeorm_1.DataSource])
], EntityProxyService);
//# sourceMappingURL=entity-proxy.service.js.map