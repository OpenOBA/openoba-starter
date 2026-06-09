// @openoba/types — 色彩层枚举
// 来源：color.constants.ts + color.dto.ts
// V1.4-b M1 Step 3

/** 色彩状态 */
export const COLOR_STATUS = ['draft', 'active', 'archived'] as const
export type ColorStatus = (typeof COLOR_STATUS)[number]

/** 设计项目状态 */
export const PROJECT_STATUS = ['draft', 'designing', 'reviewing', 'approved', 'production', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUS)[number]

/** 项目优先级 */
export const PROJECT_PRIORITY = ['low', 'normal', 'high', 'urgent'] as const
export type ProjectPriority = (typeof PROJECT_PRIORITY)[number]

/** 可行性 */
export const FEASIBILITY = ['feasible', 'not_feasible', 'conditional'] as const
export type Feasibility = (typeof FEASIBILITY)[number]

/** 调色板角色 */
export const PALETTE_ROLE = ['primary', 'secondary', 'accent'] as const
export type PaletteRole = (typeof PALETTE_ROLE)[number]

/** 季节性调色板状态 */
export const SEASONAL_PALETTE_STATUS = ['draft', 'active', 'archived'] as const
export type SeasonalPaletteStatus = (typeof SEASONAL_PALETTE_STATUS)[number]

/** 兼容性等级 */
export const COMPATIBILITY_LEVEL = ['color', 'style', 'texture', 'smart'] as const
export type CompatibilityLevel = (typeof COMPATIBILITY_LEVEL)[number]

/** 文件类型 */
export const FILE_TYPE = ['image', 'pdf', 'dwg', '3d'] as const
export type FileType = (typeof FILE_TYPE)[number]
