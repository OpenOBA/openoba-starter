/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
/**
 * Migration: 草稿池 V2 — 新增 blocks / deliveryChannel / localBasePath 字段
 *
 * 对应 entity: draft.entity.ts (Draft)
 * 设计文档: docs/content-delivery-design-V1.0.md
 */
export class AddDraftBlocksAndDeliveryChannel1710000000000 {
  name = 'AddDraftBlocksAndDeliveryChannel1710000000000'

  async up(queryRunner: any): Promise<void> {
    // MySQL JSON 类型，支持 ContentBlock[] 存储
    await queryRunner.query(`
      ALTER TABLE draft
        ADD COLUMN blocks JSON NULL
        COMMENT 'ContentBlock 数组，支持 block-based 内容格式'
    `)

    // 交付渠道
    await queryRunner.query(`
      ALTER TABLE draft
        ADD COLUMN delivery_channel VARCHAR(20) NOT NULL DEFAULT 'system'
        COMMENT '交付渠道: system | local_file'
    `)

    // 本地文件基准路径
    await queryRunner.query(`
      ALTER TABLE draft
        ADD COLUMN local_base_path VARCHAR(500) NULL
        COMMENT '本地文件系统交付时的基准路径'
    `)
  }

  async down(queryRunner: any): Promise<void> {
    await queryRunner.query(`ALTER TABLE draft DROP COLUMN local_base_path`)
    await queryRunner.query(`ALTER TABLE draft DROP COLUMN delivery_channel`)
    await queryRunner.query(`ALTER TABLE draft DROP COLUMN blocks`)
  }
}
