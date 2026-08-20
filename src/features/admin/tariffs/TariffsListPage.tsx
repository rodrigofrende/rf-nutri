import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Tariff } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import {
  useCreateTariff,
  useRemoveTariff,
  useTariffs,
  useUpdateTariff,
} from '@/hooks/useTariffs'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FullPageSpinner, Heading, IconButton, Text } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { frequencyLabel } from '@/utils/tariffs'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { TariffFormModal } from './TariffFormModal'

export function TariffsListPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const run = useToastAction()
  const { data: tariffs = [], isLoading } = useTariffs(clinicId)
  const create = useCreateTariff(clinicId)
  const update = useUpdateTariff(clinicId)
  const remove = useRemoveTariff(clinicId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tariff | null>(null)
  const [toDelete, setToDelete] = useState<Tariff | null>(null)

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (t: Tariff) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<Tariff, 'id'>) => {
    const ok = await run(
      () =>
        editing ? update.mutateAsync({ tariffId: editing.id, data }) : create.mutateAsync(data),
      {
        success: editing ? 'Tarifa actualizada' : 'Tarifa creada',
        error: 'No se pudo guardar la tarifa',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Tarifa eliminada',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  return (
    <AppLayout
      title="Tarifas"
      subtitle="Planes y precios que ofrece tu consultorio."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nueva tarifa
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : tariffs.length === 0 ? (
        <EmptyState
          icon={tariffIconMeta().icon}
          title="Sin tarifas"
          description="Creá los planes que ofrecés (servicio, frecuencia y precio) para asignarlos a tus pacientes."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tariffs.map((t) => {
            const { icon: TariffIcon } = tariffIconMeta(t.icon)
            return (
            <Card key={t.id} className={cn('flex flex-col p-5', !t.active && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <TariffIcon className="size-5" />
                </div>
                <div className="flex gap-1">
                  <IconButton
                    icon={<Pencil className="size-4" />}
                    label={`Editar ${t.name}`}
                    onClick={() => openEdit(t)}
                  />
                  <IconButton
                    icon={<Trash2 className="size-4" />}
                    label={`Eliminar ${t.name}`}
                    tone="danger"
                    onClick={() => setToDelete(t)}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Heading variant="card">{t.name}</Heading>
                <Badge tone="neutral">{frequencyLabel(t.weeklyFrequency)}</Badge>
                {!t.active && <Badge tone="amber">Inactiva</Badge>}
              </div>
              {t.description && (
                <Text variant="caption" className="mt-1">
                  {t.description}
                </Text>
              )}
              <Text variant="metric" className="mt-3">
                {formatCurrency(t.price)}
                <span className="text-sm font-normal text-zinc-400"> /mes</span>
              </Text>
            </Card>
            )
          })}
        </div>
      )}

      <TariffFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar tarifa"
        description={`¿Querés eliminar la tarifa "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}
