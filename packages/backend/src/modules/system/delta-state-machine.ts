/**
 * ERA Delta 状态机 — 变更生命周期管理
 *
 * 【设计理念】
 * 这是一个可替换的状态机。流程步骤通过 TRANSITIONS 表定义，
 * 如果未来需要调整流程（如增加"预发布"环节），只需修改此文件。
 *
 * 【当前流程】（两级审批）
 *   pending_staging → on_staging → verified → promoted (完成)
 *                    ↘ failed   → pending_staging (回流)
 *
 * 【状态说明】
 *   pending_staging   : 代码已修改，等待用户申请测试
 *   deploying_staging : 系统正在部署到 staging（过渡态）
 *   on_staging        : staging 已就绪，等待用户测试验收
 *   verifying         : 用户正在验收 staging（过渡态）
 *   verified          : 测试通过，等待申请上线
 *   failed            : 测试未通过，用户已反馈问题
 *   promoting         : 正在发布到 production（过渡态）
 *   promoted          : 已发布到生产环境（终态）
 *   rolled_back       : 已回滚（终态）
 *   discarded         : 用户放弃此变更（终态）
 *
 * 【可修改点】
 * 1. 如需增加流程步骤 → 在 TRANSITIONS 表加行
 * 2. 如需调整触发条件 → 修改 allowedActions() 函数
 * 3. 如需增加审批节点 → 新增状态 + 在 Chat 卡片中加按钮
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-05-23
 * @note 流程需要多轮迭代，此文件是核心可替换点
 */

export type DeltaStatus =
  | 'pending_staging'
  | 'deploying_staging'
  | 'on_staging'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'promoting'
  | 'promoted'
  | 'rolled_back'
  | 'discarded'

/**
 * 状态转换表
 * key: 当前状态
 * value: 允许转换到的下一状态列表
 *
 * 【如何修改流程】
 * 例如要在 pending_staging 和 on_staging 之间加一个"代码评审"状态：
 * 1. 新增 'code_review' 状态
 * 2. pending_staging → code_review → on_staging
 */
export const TRANSITIONS: Record<DeltaStatus, DeltaStatus[]> = {
  pending_staging: ['deploying_staging', 'discarded'],
  deploying_staging: ['on_staging', 'failed'],
  on_staging: ['verifying', 'failed', 'discarded'],
  verifying: ['verified', 'failed'],
  verified: ['promoting', 'discarded'], // 用户也可能放弃已验证的变更
  failed: ['pending_staging', 'discarded'], // 反馈后可重新申请测试，或放弃
  promoting: ['promoted', 'failed'],
  promoted: ['rolled_back'], // 仅支持回滚
  rolled_back: [], // 终态
  discarded: [], // 终态
}

/**
 * 每个状态下允许的用户操作
 * 这些操作对应 Chat 消息卡片中的按钮
 *
 * 【如何增加操作】
 * 在对应状态的数组中添加 { action, label, confirmText }
 */
export interface DeltaAction {
  action: string // API 调用名: 'apply_staging' | 'test_passed' | 'test_failed' | 'apply_promote' | 'discard' | 'rollback'
  label: string // 按钮文案
  type: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  confirmText?: string // 点击后需要二次确认的文案（空 = 无需确认）
  inputRequired?: boolean // 是否需要用户输入文字（如反馈问题）
  inputLabel?: string // 输入框的 placeholder
}

export function getAvailableActions(status: DeltaStatus): DeltaAction[] {
  switch (status) {
    case 'pending_staging':
      return [
        { action: 'apply_staging', label: '📤 申请测试', type: 'primary' },
        {
          action: 'discard',
          label: '🗑 放弃变更',
          type: 'default',
          confirmText: '确认放弃此变更？所有未提交的代码修改将被丢弃。',
        },
      ]
    case 'on_staging':
      return [
        {
          action: 'test_passed',
          label: '✅ 测试通过，申请上线',
          type: 'success',
          confirmText: '确认测试通过？将进入上线审批流程。',
        },
        {
          action: 'test_failed',
          label: '❌ 测试未通过',
          type: 'danger',
          inputRequired: true,
          inputLabel: '请描述测试发现的问题...',
        },
      ]
    case 'verified':
      return [
        {
          action: 'apply_promote',
          label: '🚀 确认发布到生产',
          type: 'danger',
          confirmText: '即将发布到生产环境。当前在线用户可能短暂受到影响。确认发布？',
        },
        { action: 'discard', label: '取消发布', type: 'default' },
      ]
    case 'promoted':
      return [
        {
          action: 'rollback',
          label: '⏪ 回滚此版本',
          type: 'warning',
          confirmText: '确认回滚到上一版本？生产环境将重启。数据库 nullable 字段不受影响。',
        },
      ]
    case 'failed':
      return [
        { action: 'retry', label: '🔄 修改后重新测试', type: 'primary' },
        { action: 'discard', label: '🗑 放弃变更', type: 'default' },
      ]
    default:
      return []
  }
}

/**
 * 获取状态的展示信息
 */
export function getStatusInfo(status: DeltaStatus): { label: string; color: string; icon: string } {
  const map: Record<DeltaStatus, { label: string; color: string; icon: string }> = {
    pending_staging: { label: '待申请测试', color: '#909399', icon: '⏳' },
    deploying_staging: { label: '部署中...', color: '#e6a23c', icon: '🔄' },
    on_staging: { label: '测试中', color: '#409eff', icon: '🧪' },
    verifying: { label: '验收中...', color: '#e6a23c', icon: '🔍' },
    verified: { label: '待上线审批', color: '#67c23a', icon: '✅' },
    failed: { label: '测试未通过', color: '#f56c6c', icon: '❌' },
    promoting: { label: '发布中...', color: '#e6a23c', icon: '🚀' },
    promoted: { label: '已上线', color: '#67c23a', icon: '🎉' },
    rolled_back: { label: '已回滚', color: '#f56c6c', icon: '⏪' },
    discarded: { label: '已放弃', color: '#c0c4cc', icon: '🗑' },
  }
  return map[status]
}
