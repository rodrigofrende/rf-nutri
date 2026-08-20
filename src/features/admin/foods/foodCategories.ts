import type { FoodCategory } from '@/types'

/**
 * Orden estable de categorías para filtros y selects: sigue la lógica de una
 * consulta (primero lo que más se prescribe) y termina en "Otros". Es un array
 * aparte y no `Object.keys(FOOD_CATEGORY_LABELS)` para que el orden sea un
 * contrato explícito y no dependa de la inserción del objeto.
 */
export const FOOD_CATEGORY_ORDER: FoodCategory[] = [
  'cereales_legumbres',
  'panificados',
  'frutas',
  'verduras',
  'carnes_pescados',
  'huevos',
  'lacteos',
  'grasas_aceites',
  'bebidas',
  'dulces_snacks',
  'preparaciones',
  'suplementos',
  'otros',
]

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  cereales_legumbres: 'Cereales y legumbres',
  panificados: 'Panificados',
  frutas: 'Frutas',
  verduras: 'Verduras',
  carnes_pescados: 'Carnes y pescados',
  huevos: 'Huevos',
  lacteos: 'Lácteos',
  grasas_aceites: 'Grasas y aceites',
  bebidas: 'Bebidas',
  dulces_snacks: 'Dulces y snacks',
  preparaciones: 'Preparaciones',
  suplementos: 'Suplementos',
  otros: 'Otros',
}
