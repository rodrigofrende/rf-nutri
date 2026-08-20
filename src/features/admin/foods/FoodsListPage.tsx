import { useMemo, useState } from 'react'
import { Apple, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Food, FoodCategory } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCreateFood, useFoods, useRemoveFood, useUpdateFood } from '@/hooks/useFoods'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  IconButton,
  Input,
  Select,
  Table,
  Text,
  Toggle,
  type Column,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ORDER } from './foodCategories'
import { FoodFormModal } from './FoodFormModal'
import { ImportSeedButton } from './ImportSeedButton'
import { FOODS_HELP } from '@/content/help'

/** Números es-AR con hasta 1 decimal (2.7 → "2,7"), para las columnas de macros. */
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })

/** Resumen legible de medidas caseras: "1 taza = 200 g · 1 pocillo = 100 g". */
function measuresSummary(food: Food): string {
  if (!food.measures?.length) return ''
  return food.measures.map((m) => `1 ${m.name} = ${fmt(m.grams)} g`).join(' · ')
}

function SourceBadge({ source }: { source?: Food['source'] }) {
  // El origen del alimento importa al editar: "base" viene del catálogo seed
  // (valores de referencia), "propio" lo cargó el consultorio.
  return source === 'seed' ? <Badge tone="sky">Base</Badge> : <Badge tone="brand">Propio</Badge>
}

export function FoodsListPage() {
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const run = useToastAction()
  const { data: foods = [], isLoading } = useFoods(clinicId)
  const createFood = useCreateFood(clinicId)
  const updateFood = useUpdateFood(clinicId)
  const removeFood = useRemoveFood(clinicId)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FoodCategory | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Food | null>(null)
  const [toDelete, setToDelete] = useState<Food | null>(null)

  // Solo se ofrecen las categorías con alimentos: una fila de 13 chips vacíos
  // no filtra nada y empuja la tabla para abajo.
  const usedCategories = useMemo(() => {
    const present = new Set(foods.map((f) => f.category))
    return FOOD_CATEGORY_ORDER.filter((c) => present.has(c))
  }, [foods])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return foods.filter((f) => {
      if (category !== 'all' && f.category !== category) return false
      return !q || f.name.toLowerCase().includes(q)
    })
  }, [foods, search, category])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (food: Food) => {
    setEditing(food)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Pick<Food, 'name' | 'category' | 'per100' | 'measures' | 'active'>) => {
    const ok = await run(
      () =>
        editing
          ? updateFood.mutateAsync({ foodId: editing.id, data })
          : createFood.mutateAsync({ ...data, source: 'custom', createdBy: user?.uid ?? '' }),
      {
        success: editing ? 'Alimento actualizado' : 'Alimento creado',
        error: 'No se pudo guardar el alimento',
      },
    )
    if (ok) setModalOpen(false)
  }

  // Toggle rápido de activo sin toast de éxito: el switch ya muestra el
  // resultado y avisar cada vez sería ruido.
  const toggleActive = (food: Food, active: boolean) => {
    void run(() => updateFood.mutateAsync({ foodId: food.id, data: { active } }), {
      error: 'No se pudo actualizar el alimento',
    })
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeFood.mutateAsync(toDelete.id), {
      success: 'Alimento eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  const columns: Column<Food>[] = [
    {
      key: 'name',
      header: 'Alimento',
      render: (f) => (
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="listItem" className={cn(!f.active && 'text-zinc-400')}>
            {f.name}
          </Text>
          <SourceBadge source={f.source} />
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (f) => <span className="text-zinc-500">{FOOD_CATEGORY_LABELS[f.category]}</span>,
    },
    { key: 'kcal', header: 'Kcal', className: 'text-right', render: (f) => fmt(f.per100.kcal) },
    { key: 'protein', header: 'Prot. (g)', className: 'text-right', render: (f) => fmt(f.per100.protein) },
    { key: 'carbs', header: 'Carb. (g)', className: 'text-right', render: (f) => fmt(f.per100.carbs) },
    { key: 'fat', header: 'Grasas (g)', className: 'text-right', render: (f) => fmt(f.per100.fat) },
    {
      key: 'measures',
      header: 'Medidas caseras',
      render: (f) =>
        f.measures?.length ? (
          <span className="text-xs text-zinc-500">{measuresSummary(f)}</span>
        ) : (
          <span className="text-zinc-300">—</span>
        ),
    },
    {
      key: 'active',
      header: 'Activo',
      render: (f) => (
        <Toggle
          checked={f.active}
          onChange={(active) => toggleActive(f, active)}
          id={`food-active-${f.id}`}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-px whitespace-nowrap',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Pencil className="size-4" />}
            label={`Editar ${f.name}`}
            onClick={() => openEdit(f)}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label={`Eliminar ${f.name}`}
            tone="danger"
            onClick={() => setToDelete(f)}
          />
        </div>
      ),
    },
  ]

  return (
    <AppLayout
      title="Alimentos"
      subtitle="Tu catálogo para armar planes. Valores por 100 g / 100 ml."
      help={FOODS_HELP}
      helpTitle="Cómo funciona el catálogo"
      actions={
        <>
          <ImportSeedButton clinicId={clinicId} />
          <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
            Nuevo alimento
          </Button>
        </>
      }
    >
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="Buscar alimento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* En mobile el filtro es un select (los chips no entran); en desktop, chips. */}
          {usedCategories.length > 0 && (
            <div className="sm:hidden">
              <Select
                aria-label="Filtrar por categoría"
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory | 'all')}
                options={[
                  { value: 'all', label: 'Todas las categorías' },
                  ...usedCategories.map((c) => ({ value: c, label: FOOD_CATEGORY_LABELS[c] })),
                ]}
              />
            </div>
          )}
        </div>

        {usedCategories.length > 0 && (
          <div
            className="hidden gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filtrar por categoría"
          >
            <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
              Todas
            </CategoryChip>
            {usedCategories.map((c) => (
              <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {FOOD_CATEGORY_LABELS[c]}
              </CategoryChip>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        foods.length === 0 ? (
          <EmptyState
            icon={Apple}
            title="Sin alimentos"
            description="Importá el catálogo base de alimentos argentinos o cargá el primero a mano."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ImportSeedButton clinicId={clinicId} />
                <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
                  Nuevo alimento
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="No hay alimentos que coincidan con la búsqueda o el filtro."
          />
        )
      ) : (
        <>
          {/* Cards en mobile: la tabla de 9 columnas no entra en pantallas chicas */}
          <div className="space-y-3 md:hidden">
            {filtered.map((f) => (
              <Card key={f.id} className={cn('p-4', !f.active && 'opacity-70')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text variant="listItem" className="truncate">
                        {f.name}
                      </Text>
                      <SourceBadge source={f.source} />
                    </div>
                    <Text variant="caption" className="mt-0.5">
                      {FOOD_CATEGORY_LABELS[f.category]}
                    </Text>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      icon={<Pencil className="size-4" />}
                      label={`Editar ${f.name}`}
                      onClick={() => openEdit(f)}
                    />
                    <IconButton
                      icon={<Trash2 className="size-4" />}
                      label={`Eliminar ${f.name}`}
                      tone="danger"
                      onClick={() => setToDelete(f)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {fmt(f.per100.kcal)} kcal · P {fmt(f.per100.protein)} g · C {fmt(f.per100.carbs)} g · G{' '}
                  {fmt(f.per100.fat)} g
                  <span className="text-xs text-zinc-400"> /100 g</span>
                </p>
                {f.measures?.length ? (
                  <Text variant="caption" className="mt-1">
                    {measuresSummary(f)}
                  </Text>
                ) : null}
                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <Toggle
                    checked={f.active}
                    onChange={(active) => toggleActive(f, active)}
                    label="Activo"
                    id={`food-active-m-${f.id}`}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <Table columns={columns} rows={filtered} keyOf={(f) => f.id} />
          </div>
        </>
      )}

      <FoodFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={createFood.isPending || updateFood.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar alimento"
        description={`¿Querés eliminar "${toDelete?.name}"? Los planes que ya lo usan no se rompen (guardan su propia copia de los valores).${toDelete?.source === 'seed' ? ' Al ser un alimento del catálogo base, va a volver si reimportás el catálogo.' : ''}`}
        loading={removeFood.isPending}
      />
    </AppLayout>
  )
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-zinc-200 bg-surface text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}
