import { describe, expect, it } from 'vitest'
import { addDays, lastNDayKeys, parseDayKey, toDayKey, toWeekKey } from '@/utils/dateKeys'

describe('toDayKey / parseDayKey', () => {
  it('formatea en hora local con padding', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('roundtrip', () => {
    const d = parseDayKey('2026-08-20')
    expect(d).not.toBeNull()
    expect(toDayKey(d!)).toBe('2026-08-20')
  })
  it('rechaza formatos inválidos', () => {
    expect(parseDayKey('2026-8-2')).toBeNull()
    expect(parseDayKey('ayer')).toBeNull()
  })
})

describe('toWeekKey (semana ISO 8601)', () => {
  it('el 1/1/2026 es jueves → semana 1 de 2026', () => {
    expect(toWeekKey(new Date(2026, 0, 1))).toBe('2026-W01')
  })
  it('el 1/1/2023 es domingo → pertenece a la última semana ISO de 2022', () => {
    expect(toWeekKey(new Date(2023, 0, 1))).toBe('2022-W52')
  })
  it('lunes y domingo de la misma semana comparten key', () => {
    expect(toWeekKey(new Date(2026, 7, 17))).toBe(toWeekKey(new Date(2026, 7, 23)))
    expect(toWeekKey(new Date(2026, 7, 23))).not.toBe(toWeekKey(new Date(2026, 7, 24)))
  })
})

describe('lastNDayKeys', () => {
  it('devuelve n días ascendentes terminando en la fecha dada', () => {
    const keys = lastNDayKeys(3, new Date(2026, 7, 20))
    expect(keys).toEqual(['2026-08-18', '2026-08-19', '2026-08-20'])
  })
})

describe('addDays', () => {
  it('cruza meses sin mutar el original', () => {
    const base = new Date(2026, 0, 31)
    expect(toDayKey(addDays(base, 1))).toBe('2026-02-01')
    expect(toDayKey(base)).toBe('2026-01-31')
  })
})
