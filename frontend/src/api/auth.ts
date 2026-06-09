import request from './request'

export const login = (data: { username: string; password: string }) =>
  request.post<any, { accessToken: string; user: Record<string, unknown> }>('/auth/login', data)

export const getDict = () => request.get<string[]>('/dict')
export const getDictByTable = (table: string) => request.get<any[]>(`/dict/${table}`)
