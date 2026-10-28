import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MaterialSummaryDto,
  MaterialType,
  PublicTimelineDto,
  ShareDto,
  ShareMethod,
  TimelineDto,
} from '@timeline-viewer/shared';
import { api } from './client';

export const materialsKey = (type?: MaterialType) => ['materials', type ?? 'ALL'] as const;

export function useMaterials(type?: MaterialType) {
  return useQuery({
    queryKey: materialsKey(type),
    queryFn: async () =>
      (
        await api.get<{ materials: MaterialSummaryDto[] }>(
          `/api/materials${type ? `?type=${type}` : ''}`,
        )
      ).materials,
  });
}

export function useTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ['timeline', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<{ timeline: TimelineDto }>(`/api/timelines/${id}`)).timeline,
  });
}

export function useSaveTimeline(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) =>
      (id
        ? await api.put<{ timeline: TimelineDto }>(`/api/timelines/${id}`, payload)
        : await api.post<{ timeline: TimelineDto }>('/api/timelines', payload)
      ).timeline,
    onSuccess: (timeline) => {
      qc.setQueryData(['timeline', timeline.id], timeline);
      void qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDeleteTimeline(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/api/timelines/${id}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['timeline', id] });
      void qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export interface ShareResult {
  materialId: string;
  share: ShareDto;
}

export function useShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { materialIds: string[]; method: ShareMethod }) =>
      (await api.post<{ shares: ShareResult[] }>('/api/shares', body)).shares,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['materials'] });
      void qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useUnshare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => api.delete<void>(`/api/materials/${materialId}/share`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['materials'] });
      void qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function usePublicTimeline(token: string | undefined) {
  return useQuery({
    queryKey: ['public', token],
    enabled: Boolean(token),
    queryFn: async () =>
      (await api.get<{ timeline: PublicTimelineDto }>(`/api/public/s/${token}`)).timeline,
  });
}
