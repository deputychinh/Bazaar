import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApplicationPage,
  ApplicationsQuery,
  EventLogPage,
  EventsQuery,
  ModerationPage,
  ModerationQuery,
} from '@/interfaces/platform.interface';

import * as platform from '../services/platform.service';

export const platformKeys = {
  applications: (query: ApplicationsQuery) => ['applications', query] as const,
  moderation: (query: ModerationQuery) => ['moderation', query] as const,
  events: (query: EventsQuery) => ['events', query] as const,
};

export const useApplications = (query: ApplicationsQuery): UseQueryResult<ApplicationPage> =>
  useQuery({
    queryKey: platformKeys.applications(query),
    queryFn: () => platform.listApplications(query),
    placeholderData: keepPreviousData,
  });

export const useReview = (): UseMutationResult<unknown, Error, { id: string; reason?: string }> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      reason === undefined
        ? platform.approveApplication(id)
        : platform.rejectApplication(id, reason),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useModeration = (query: ModerationQuery): UseQueryResult<ModerationPage> =>
  useQuery({
    queryKey: platformKeys.moderation(query),
    queryFn: () => platform.listForModeration(query),
    placeholderData: keepPreviousData,
  });

export const useModerate = (): UseMutationResult<
  unknown,
  Error,
  { id: string; hideReason?: string }
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hideReason }) =>
      hideReason === undefined ? platform.restoreProduct(id) : platform.hideProduct(id, hideReason),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['moderation'] }),
  });
};

export const useEvents = (query: EventsQuery): UseQueryResult<EventLogPage> =>
  useQuery({
    queryKey: platformKeys.events(query),
    queryFn: () => platform.searchEvents(query),
    placeholderData: keepPreviousData,
  });
