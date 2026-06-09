import request from './request';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

export function getReviews(params?: QueryParams) { return request.get('/reviews', { params }); }
export function getReview(id: string) { return request.get(`/reviews/${id}`); }
export function createReview(data: CreateUpdateData) { return request.post('/reviews', data); }
export function reviewAction(id: string, data: { action: string }) { return request.post(`/reviews/${id}/action`, data); }
export function replyReview(id: string, data: { content: string; replyBy?: string }) { return request.post(`/reviews/${id}/reply`, data); }
export function markHelpful(id: string) { return request.post(`/reviews/${id}/helpful`); }
export function deleteReview(id: string) { return request.delete(`/reviews/${id}`); }
export function getReviewTags() { return request.get('/reviews/tags'); }
export function getSpuStats(spuId: string) { return request.get(`/reviews/spu/${spuId}/stats`); }
