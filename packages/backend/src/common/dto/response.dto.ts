/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

export class PageResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items
    this.total = total
    this.page = page
    this.pageSize = pageSize
    this.totalPages = Math.ceil(total / pageSize)
  }
}

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  }
}

export class SuccessResponse {
  code: number
  message: string
  data: any
  timestamp: number

  constructor(data: any, message = 'success') {
    this.code = 0
    this.message = message
    this.data = data
    this.timestamp = Date.now()
  }
}
