import request from './request'

export const login = (data: { username: string; password: string }): Promise<{ accessToken: string; user: Record<string, unknown> }> =>
  request.post('/auth/login', data) as Promise<{ accessToken: string; user: Record<string, unknown> }>

export const getDict = () => request.get<string[]>('/dict')
export const getDictByTable = (table: string) => request.get<Record<string, unknown>[]>(`/dict/${table}`)
