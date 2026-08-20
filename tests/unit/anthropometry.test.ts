import { describe, expect, it } from 'vitest'
import {
  ageAt,
  bmi,
  bmiCategory,
  bmrHarrisBenedict,
  bmrMifflin,
  bodyFatDurnin,
  bodyFatFaulkner,
  deriveAnthropometry,
  durninWomersleyDensity,
  fatMassKg,
  leanMassKg,
  siriBodyFat,
  tdee,
  waistHeightRatio,
  waistHipRatio,
} from '@/utils/anthropometry'

/**
 * Valores de referencia calculados a mano con las fórmulas publicadas.
 * Si un test de acá falla, NO "ajustar el expected": está mal la fórmula.
 */

describe('bmi', () => {
  it('calcula el IMC clásico', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2)
  })
  it('devuelve null sin datos', () => {
    expect(bmi(0, 175)).toBeNull()
    expect(bmi(70, 0)).toBeNull()
  })
  it('clasifica según OMS', () => {
    expect(bmiCategory(17)).toBe('bajo_peso')
    expect(bmiCategory(22)).toBe('normal')
    expect(bmiCategory(27)).toBe('sobrepeso')
    expect(bmiCategory(32)).toBe('obesidad_1')
    expect(bmiCategory(37)).toBe('obesidad_2')
    expect(bmiCategory(42)).toBe('obesidad_3')
  })
})

describe('índices de perímetros', () => {
  it('ICC = cintura/cadera', () => {
    expect(waistHipRatio(80, 100)).toBeCloseTo(0.8, 5)
    expect(waistHipRatio(undefined, 100)).toBeNull()
  })
  it('cintura/talla', () => {
    expect(waistHeightRatio(80, 175)).toBeCloseTo(0.457, 3)
  })
})

describe('Durnin-Womersley + Siri', () => {
  // Hombre de 25 años, Σ4 pliegues (bíceps 5 + tríceps 10 + subescapular 12 +
  // cresta ilíaca 13) = 40 mm → franja 20-29: D = 1.1631 − 0.0632·log10(40)
  const skinfolds = { biceps: 5, triceps: 10, subscapular: 12, iliacCrest: 13 }

  it('densidad corporal con coeficientes por sexo/edad', () => {
    expect(durninWomersleyDensity(skinfolds, 'male', 25)).toBeCloseTo(1.06185, 4)
  })
  it('Siri convierte densidad a % grasa', () => {
    expect(siriBodyFat(1.06185)).toBeCloseTo(16.17, 1)
  })
  it('pipeline completo', () => {
    expect(bodyFatDurnin(skinfolds, 'male', 25)).toBeCloseTo(16.17, 1)
    // Otra franja etaria (30-39) cambia los coeficientes → otro resultado.
    expect(bodyFatDurnin(skinfolds, 'male', 32)).toBeCloseTo(19.17, 1)
  })
  it('null si falta un pliegue requerido', () => {
    expect(bodyFatDurnin({ biceps: 5, triceps: 10, subscapular: 12 }, 'male', 25)).toBeNull()
  })
})

describe('Faulkner', () => {
  it('%grasa = 0.153·Σ4 + 5.783 (tríceps+subescapular+supraespinal+abdominal)', () => {
    const skinfolds = { triceps: 10, subscapular: 12, supraspinale: 8, abdominal: 20 }
    expect(bodyFatFaulkner(skinfolds)).toBeCloseTo(13.433, 3)
  })
  it('null si falta un pliegue', () => {
    expect(bodyFatFaulkner({ triceps: 10, subscapular: 12, supraspinale: 8 })).toBeNull()
  })
})

describe('masas', () => {
  it('masa grasa y magra desde el % de grasa', () => {
    expect(fatMassKg(70, 20)).toBeCloseTo(14, 5)
    expect(leanMassKg(70, 20)).toBeCloseTo(56, 5)
  })
})

describe('gasto energético', () => {
  it('Mifflin-St Jeor hombre y mujer (70 kg, 175 cm, 30 años)', () => {
    expect(bmrMifflin(70, 175, 30, 'male')).toBeCloseTo(1648.75, 2)
    expect(bmrMifflin(70, 175, 30, 'female')).toBeCloseTo(1482.75, 2)
  })
  it('Harris-Benedict revisada (70 kg, 175 cm, 30 años, hombre)', () => {
    expect(bmrHarrisBenedict(70, 175, 30, 'male')).toBeCloseTo(1695.67, 1)
  })
  it('GET = TMB × factor de actividad', () => {
    expect(tdee(1648.75, 'moderate')).toBeCloseTo(2555.56, 1)
    expect(tdee(1648.75, 'sedentary')).toBeCloseTo(1978.5, 1)
  })
})

describe('ageAt', () => {
  it('cumple años el día exacto', () => {
    const birth = new Date(1990, 5, 15)
    expect(ageAt(birth, new Date(2020, 5, 14))).toBe(29)
    expect(ageAt(birth, new Date(2020, 5, 15))).toBe(30)
  })
})

describe('deriveAnthropometry', () => {
  it('deriva todo lo posible con contexto completo', () => {
    const derived = deriveAnthropometry(
      {
        weightKg: 70,
        heightCm: 175,
        perimeters: { waist: 80, hip: 100 },
        skinfolds: { biceps: 5, triceps: 10, subscapular: 12, iliacCrest: 13, supraspinale: 8, abdominal: 20 },
      },
      { sex: 'male', ageYears: 25, activityLevel: 'moderate' },
    )
    expect(derived.bmi).toBeCloseTo(22.86, 2)
    expect(derived.bmiCategory).toBe('normal')
    expect(derived.waistHipRatio).toBeCloseTo(0.8, 5)
    expect(derived.bodyFatDurnin).toBeCloseTo(16.17, 1)
    expect(derived.bodyFatFaulkner).toBeCloseTo(13.43, 1)
    // Masas usan Durnin (preferida) cuando está disponible.
    expect(derived.fatMassKg).toBeCloseTo(11.32, 1)
    // Mifflin a los 25 años: 1673.75 × 1.55
    expect(derived.tdee).toBeCloseTo(2594.31, 1)
  })

  it('usa la talla del member como respaldo y queda null lo incalculable', () => {
    const derived = deriveAnthropometry(
      { weightKg: 70 },
      { sex: 'female', ageYears: 30, fallbackHeightCm: 160 },
    )
    expect(derived.bmi).toBeCloseTo(27.34, 2)
    expect(derived.bodyFatDurnin).toBeNull()
    expect(derived.tdee).toBeNull() // sin activityLevel
  })
})
