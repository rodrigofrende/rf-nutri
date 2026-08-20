import { z } from 'zod'

export const paymentSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  date: z.date(),
  comment: z.string().max(500).optional(),
})

export const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .optional()
  .or(z.literal(''))

export type PaymentInput = z.infer<typeof paymentSchema>
