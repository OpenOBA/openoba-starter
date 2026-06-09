/**
 * 系统级状态常量
 *
 * 统一定义系统级状态枚举（非运营字典，后端内部使用）。
 * 系统级状态由代码控制，运营团队不可修改，不做字典表新增。
 *
 * 用法：各模块 import 引用，消除魔法字符串。
 */

/** 用户状态（sys_user.status） */
export const USER_STATUS = ['active', 'disabled'] as const

/** 角色状态（sys_role.status） */
export const ROLE_STATUS = ['active', 'inactive'] as const

/** 权限状态（sys_permission.status） */
export const PERMISSION_STATUS = ['active', 'inactive'] as const

/** 结构标准状态（structure_standard.status） */
export const STRUCT_STATUS = ['active', 'inactive'] as const
