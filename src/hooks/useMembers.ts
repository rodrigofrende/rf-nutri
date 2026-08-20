import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Member } from '@/types'
import {
  createMember,
  getMember,
  listMembers,
  reissueMemberAccess,
  removeMember,
  updateMember,
  updateMemberProfile,
} from '@/services/membersService'
import { queryKeys } from './queryKeys'

export function useMembers(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.members(clinicId),
    queryFn: () => listMembers(clinicId),
    enabled: !!clinicId,
    staleTime: 30_000,
  })
}

export function useMember(clinicId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.member(clinicId, memberId),
    queryFn: () => getMember(clinicId, memberId),
    enabled: !!clinicId && !!memberId,
  })
}

export function useCreateMember(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Member, 'id' | 'uid'>) => createMember(clinicId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
    },
  })
}

export function useUpdateMember(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Partial<Member> }) =>
      updateMember(clinicId, memberId, data),
    onSuccess: (_r, { memberId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.members(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.member(clinicId, memberId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(clinicId) })
    },
  })
}

export function useReissueMemberAccess(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, newLoginEmail }: { memberId: string; newLoginEmail: string }) =>
      reissueMemberAccess(clinicId, memberId, newLoginEmail),
    onSuccess: (_r, { memberId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.members(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.member(clinicId, memberId) })
    },
  })
}

export function useUpdateMemberProfile(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<Member, 'fullName' | 'phone' | 'birthDate' | 'photoURL'>) =>
      updateMemberProfile(clinicId, memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.member(clinicId, memberId) })
    },
  })
}

export function useRemoveMember(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(clinicId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
    },
  })
}
