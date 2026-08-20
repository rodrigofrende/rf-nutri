import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blockEmail, listBlockedEmails, unblockEmail } from '@/services/blockedEmailsService'
import { queryKeys } from './queryKeys'

export function useBlockedEmails() {
  return useQuery({
    queryKey: queryKeys.blockedEmails(),
    queryFn: () => listBlockedEmails(),
    staleTime: 60_000,
  })
}

export function useBlockEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, reason }: { email: string; reason?: string }) =>
      blockEmail(email, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blockedEmails() }),
  })
}

export function useUnblockEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (emailKey: string) => unblockEmail(emailKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.blockedEmails() }),
  })
}
