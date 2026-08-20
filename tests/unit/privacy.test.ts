import { describe, expect, it } from 'vitest'
import { emailFingerprint, maskEmail } from '@/utils/privacy'
import { emailTypoCandidates, isPublicEmailProvider } from '@/utils/loginEmail'

/**
 * Estos helpers son la última barrera antes de que algo salga a un canal público
 * (el topic de ntfy). Un cambio que los rompa no falla en ninguna otra parte: se
 * nota recién cuando ya se filtró un email, así que van fijados por test.
 */
describe('maskEmail', () => {
  it('deja el dominio entero y sólo las puntas del local part', () => {
    expect(maskEmail('rodrigofrende@tigerfit.con')).toBe('ro***de@tigerfit.con')
  })

  it('no deja rastro del local part cuando es muy corto', () => {
    expect(maskEmail('a@x.com')).toBe('**@x.com')
    expect(maskEmail('ab@x.com')).toBe('**@x.com')
  })

  it('con local part chico muestra sólo la primera letra', () => {
    expect(maskEmail('abc@x.com')).toBe('a***@x.com')
    expect(maskEmail('abcde@x.com')).toBe('a***@x.com')
  })

  it('a partir de 6 caracteres muestra las dos puntas', () => {
    expect(maskEmail('abcdef@x.com')).toBe('ab***ef@x.com')
  })

  it('normaliza mayúsculas y espacios', () => {
    expect(maskEmail('  RODRIGO@TigerFit.com ')).toBe('ro***go@tigerfit.com')
  })

  it('no filtra nada si el valor no es un email', () => {
    expect(maskEmail('sinarroba')).toBe('***')
    expect(maskEmail('')).toBe('***')
  })
})

describe('emailFingerprint', () => {
  it('es estable e insensible a mayúsculas y espacios', () => {
    expect(emailFingerprint('Rodrigo@X.com')).toBe(emailFingerprint('  rodrigo@x.com '))
  })

  it('distingue pacientes distintos', () => {
    expect(emailFingerprint('juan@x.com')).not.toBe(emailFingerprint('pedro@x.com'))
  })

  it('siempre son 8 hex (para que el dedupe tenga clave de largo fijo)', () => {
    for (const email of ['a@b.co', 'juan.perez@tigerfit.com', '']) {
      expect(emailFingerprint(email)).toMatch(/^[0-9a-f]{8}$/)
    }
  })
})

describe('emailTypoCandidates', () => {
  it('corrige el TLD mal tipeado', () => {
    expect(emailTypoCandidates('juan@tigerfit.con')).toEqual(['juan@tigerfit.com'])
    expect(emailTypoCandidates('juan@tigerfit.cmo')).toEqual(['juan@tigerfit.com'])
  })

  it('corrige dominios de proveedor mal tipeados', () => {
    expect(emailTypoCandidates('juan@gmial.com')).toEqual(['juan@gmail.com'])
  })

  it('no propone nada si el email ya está bien escrito', () => {
    expect(emailTypoCandidates('juan@tigerfit.com')).toEqual([])
    expect(emailTypoCandidates('juan@gmail.com')).toEqual([])
  })

  it('no duplica cuando las dos reglas dan el mismo candidato', () => {
    expect(emailTypoCandidates('juan@hotmail.co')).toEqual(['juan@hotmail.com'])
  })

  it('nunca devuelve más de 2 candidatos ni se cuelga con basura', () => {
    expect(emailTypoCandidates('sinarroba').length).toBe(0)
    expect(emailTypoCandidates('@x.com').length).toBe(0)
    expect(emailTypoCandidates('juan@').length).toBe(0)
    expect(emailTypoCandidates('juan@gmial.com').length).toBeLessThanOrEqual(2)
  })
})

describe('isPublicEmailProvider', () => {
  it('reconoce casillas personales', () => {
    expect(isPublicEmailProvider('juan@gmail.com')).toBe(true)
    expect(isPublicEmailProvider('JUAN@Hotmail.com')).toBe(true)
  })

  it('no marca los alias de clinic', () => {
    expect(isPublicEmailProvider('juan@tigerfit.com')).toBe(false)
  })
})
