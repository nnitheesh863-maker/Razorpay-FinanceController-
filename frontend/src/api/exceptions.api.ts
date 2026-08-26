// src/api/exceptions.api.ts
import { apiClient } from './axios';
import type { Exception, ExceptionFilters, ExceptionNote, ExceptionSummary, ExceptionAnalytics } from '../types/exception.types';

export async function getExceptions(params: ExceptionFilters) {
  const response = await apiClient.get<Exception[]>('/exceptions', { params });
  return response.data;
}

export async function getExceptionById(id: string) {
  const response = await apiClient.get<Exception>(`/exceptions/${id}`);
  return response.data;
}

export async function assignException(id: string, assigneeId: string) {
  const response = await apiClient.patch(`/exceptions/${id}/assign`, { assigneeId });
  return response.data;
}

export async function updateExceptionStatus(id: string, status: string) {
  const response = await apiClient.patch(`/exceptions/${id}/status`, { status });
  return response.data;
}

export async function resolveException(id: string) {
  const response = await apiClient.patch(`/exceptions/${id}/resolve`);
  return response.data;
}

export async function reopenException(id: string) {
  const response = await apiClient.patch(`/exceptions/${id}/reopen`);
  return response.data;
}

export async function addExceptionNote(id: string, note: ExceptionNote) {
  const response = await apiClient.post(`/exceptions/${id}/notes`, note);
  return response.data;
}

export async function exportExceptions(params: ExceptionFilters) {
  const response = await apiClient.get<Blob>(`/exceptions/export`, { params, responseType: 'blob' });
  return response.data;
}

export async function getExceptionSummary() {
  const response = await apiClient.get<ExceptionSummary>('/exceptions/summary');
  return response.data;
}

export async function getExceptionAnalytics() {
  const response = await apiClient.get<ExceptionAnalytics>('/exceptions/analytics');
  return response.data;
}

export async function investigateExceptionWithAI(id: string) {
  const response = await apiClient.post(`/exceptions/${id}/investigate`);
  return response.data;
}
