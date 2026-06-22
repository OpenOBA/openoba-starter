export interface ApiResponse<T = unknown> {
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
  data: unknown
  timestamp: number

  constructor(data: unknown, message = 'success') {
    this.code = 0
    this.message = message
    this.data = data
    this.timestamp = Date.now()
  }
}
