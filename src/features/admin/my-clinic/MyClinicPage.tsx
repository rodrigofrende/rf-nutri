import { type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ExternalLink, GripVertical, Link2, Plus, Tags, Trash2, Video } from 'lucide-react'
import type { Clinic, ClinicPresentation as ClinicPresentationData, PublicTariff, Tariff } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useClinicPresentation, useUpdateClinicPresentation } from '@/hooks/useClinicPresentation'
import { useTariffs } from '@/hooks/useTariffs'
import { useToastAction } from '@/hooks/useToastAction'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { resolvePresentation } from '@/utils/presentation'
import { isSafeHttpUrl } from '@/utils/url'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { tariffKindLabel } from '@/utils/tariffs'
import { formatCurrency } from '@/utils/format'
import { publicClinicRoute } from '@/routes/routePaths'
import { SharePublicClinicButton } from '@/components/shared/SharePublicClinicButton'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  FullPageSpinner,
  Input,
  Spinner,
  Text,
  Textarea,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { PublicClinicView } from '@/features/clinic-presentation/PublicClinicView'

/** Snapshot de display de una tarifa (lo que se guarda en el doc público). */
function toPublicTariff(t: Tariff): PublicTariff {
  return {
    id: t.id,
    name: t.name,
    price: t.price,
    description: t.description,
    icon: t.icon,
  }
}

const MAX_VIDEOS = 6
const MAX_LINKS = 12

const schema = z
  .object({
    description: z.string().max(2000, 'Máximo 2000 caracteres'),
    videos: z.array(z.object({ url: z.string() })).max(MAX_VIDEOS, `Hasta ${MAX_VIDEOS} videos`),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .max(MAX_LINKS, `Hasta ${MAX_LINKS} enlaces`),
    tariffIds: z.array(z.string()).max(20, 'Demasiadas tarifas'),
    whatsapp: z.string().refine((v) => {
      const digits = v.replace(/\D/g, '')
      return digits.length === 0 || digits.length >= 8
    }, 'Ingresá un número válido con código de país'),
    email: z.string().email('Ingresá un email válido').or(z.literal('')),
    address: z.string().max(200, 'Máximo 200 caracteres'),
    openingHours: z.string().max(200, 'Máximo 200 caracteres'),
  })
  .superRefine((vals, ctx) => {
    vals.videos.forEach((v, i) => {
      if (v.url.trim() && !isSafeHttpUrl(v.url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['videos', i, 'url'],
          message: 'URL inválida (YouTube o Instagram, http/https)',
        })
      }
    })
    vals.links.forEach((l, i) => {
      if (!l.label.trim() && !l.url.trim()) return // fila vacía: se descarta al guardar
      if (!l.label.trim()) {
        ctx.addIssue({ code: 'custom', path: ['links', i, 'label'], message: 'Poné un título' })
      }
      if (!isSafeHttpUrl(l.url)) {
        ctx.addIssue({ code: 'custom', path: ['links', i, 'url'], message: 'URL inválida (http/https)' })
      }
    })
  })
type FormValues = z.infer<typeof schema>

/** Loader: trae clinic + presentación y monta el formulario una vez listos. */
export function MyClinicPage() {
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const { data: clinic, isLoading: clinicLoading } = useClinic(clinicId)
  const { data: presentation, isLoading: presLoading } = useClinicPresentation(clinicId)

  return (
    <AppLayout
      title="Página pública"
      subtitle="Presentación y contacto que ven tus pacientes y futuros pacientes."
      actions={
        <>
          <SharePublicClinicButton clinicId={clinicId} clinicName={clinic?.name} logoURL={clinic?.logoURL} theme={clinic?.theme} />
          <Button
            variant="secondary"
            leftIcon={<ExternalLink className="size-4" />}
            onClick={() => window.open(publicClinicRoute(clinicId), '_blank', 'noopener,noreferrer')}
          >
            Ver página pública
          </Button>
        </>
      }
    >
      {clinicLoading || presLoading || !clinic ? (
        <FullPageSpinner />
      ) : (
        <MyClinicForm clinicId={clinicId} clinic={clinic} presentation={presentation ?? null} />
      )}
    </AppLayout>
  )
}

function MyClinicForm({
  clinicId,
  clinic,
  presentation,
}: {
  clinicId: string
  clinic: Clinic
  presentation: ClinicPresentationData | null
}) {
  const run = useToastAction()
  const save = useUpdateClinicPresentation(clinicId)
  const { data: clinicTariffs = [], isLoading: tariffsLoading } = useTariffs(clinicId)
  const resolved = resolvePresentation(presentation)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: presentation?.description ?? '',
      videos: resolved.videos.map((url) => ({ url })),
      links: resolved.links.map((l) => ({ label: l.label, url: l.url })),
      tariffIds: presentation?.tariffs?.map((t) => t.id) ?? [],
      whatsapp: presentation?.whatsapp ?? '',
      email: presentation?.email ?? '',
      address: presentation?.address ?? '',
      openingHours: presentation?.openingHours ?? '',
    },
  })

  const videos = useFieldArray({ control, name: 'videos' })
  const links = useFieldArray({ control, name: 'links' })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const draft = useWatch({ control })
  const selectedIds = draft.tariffIds ?? []
  const selectedTariffs = clinicTariffs.filter((t) => selectedIds.includes(t.id)).map(toPublicTariff)
  const previewData: Partial<ClinicPresentationData> = {
    name: clinic.name,
    logoURL: clinic.logoURL,
    theme: clinic.theme,
    description: draft.description ?? '',
    videos: (draft.videos ?? []).map((v) => v?.url ?? '').filter(isSafeHttpUrl),
    links: (draft.links ?? [])
      .filter((l) => l?.label?.trim() && isSafeHttpUrl(l?.url))
      .map((l) => ({ label: (l!.label ?? '').trim(), url: (l!.url ?? '').trim() })),
    tariffs: selectedTariffs,
    whatsapp: draft.whatsapp,
    email: draft.email,
    address: draft.address,
    openingHours: draft.openingHours,
  }
  const previewStyle = buildThemeVars(clinic.theme ?? PLATFORM_DEFAULT_THEME) as CSSProperties

  const toggleTariff = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    setValue('tariffIds', next, { shouldDirty: true })
  }

  const onSubmit = (v: FormValues) =>
    run(
      async () => {
        const logoURL = clinic.logoURL?.trim()
        await save.mutateAsync({
          description: v.description,
          videos: v.videos.map((x) => x.url.trim()).filter(isSafeHttpUrl),
          links: v.links
            .filter((l) => l.label.trim() && isSafeHttpUrl(l.url))
            .map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
          tariffs: clinicTariffs.filter((t) => v.tariffIds.includes(t.id)).map(toPublicTariff),
          whatsapp: v.whatsapp,
          email: v.email,
          address: v.address,
          openingHours: v.openingHours,
          name: clinic.name,
          // Mirror de marca: solo data URL (rules de publicProfiles); null → deleteField.
          logoURL: logoURL && /^data:image\//i.test(logoURL) ? logoURL : null,
          theme: clinic.theme ?? PLATFORM_DEFAULT_THEME,
          updatedAt: new Date(),
        })
      },
      { success: 'Presentación actualizada', error: 'No se pudo guardar la presentación' },
    )

  const onDragEnd =
    (ids: string[], move: (from: number, to: number) => void) => (event: DragEndEvent) => {
      const activeId = String(event.active.id)
      const overId = event.over ? String(event.over.id) : ''
      if (!overId || activeId === overId) return
      const from = ids.indexOf(activeId)
      const to = ids.indexOf(overId)
      if (from >= 0 && to >= 0) move(from, to)
    }

  const videoIds = videos.fields.map((f) => f.id)
  const linkIds = links.fields.map((f) => f.id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Descripción" subtitle="Contá de qué se trata tu consultorio." />
          <CardBody>
            <FormField label="Descripción" error={errors.description?.message}>
              <Textarea
                rows={5}
                placeholder="Contá sobre tu consultorio, tu enfoque, especialidades, experiencia..."
                {...register('description')}
                invalid={!!errors.description}
              />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Videos"
            subtitle="Pegá links de YouTube o Instagram. Arrastrá para ordenar."
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => videos.append({ url: '' })}
                disabled={videos.fields.length >= MAX_VIDEOS}
              >
                Agregar
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {videos.fields.length === 0 ? (
              <EmptyHint icon={<Video className="size-4" />} text="Todavía no agregaste videos." />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd(videoIds, videos.move)}
              >
                <SortableContext items={videoIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {videos.fields.map((field, i) => (
                      <SortableRow
                        key={field.id}
                        id={field.id}
                        onRemove={() => videos.remove(i)}
                        removeLabel={`Eliminar video ${i + 1}`}
                      >
                        <FormField label={`Video ${i + 1}`} error={errors.videos?.[i]?.url?.message}>
                          <Input
                            placeholder="https://youtube.com/watch?v=... o instagram.com/reel/..."
                            {...register(`videos.${i}.url`)}
                            invalid={!!errors.videos?.[i]?.url}
                          />
                        </FormField>
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {errors.videos?.message && (
              <p className="text-xs text-red-500">{errors.videos.message}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Enlaces"
            subtitle="Redes, web, tienda, reservas, ubicación... Arrastrá para ordenar."
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => links.append({ label: '', url: '' })}
                disabled={links.fields.length >= MAX_LINKS}
              >
                Agregar
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {links.fields.length === 0 ? (
              <EmptyHint icon={<Link2 className="size-4" />} text="Todavía no agregaste enlaces." />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd(linkIds, links.move)}
              >
                <SortableContext items={linkIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {links.fields.map((field, i) => (
                      <SortableRow
                        key={field.id}
                        id={field.id}
                        onRemove={() => links.remove(i)}
                        removeLabel={`Eliminar enlace ${i + 1}`}
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField label="Título" error={errors.links?.[i]?.label?.message}>
                            <Input
                              placeholder="Ej. Agendá tu consulta"
                              {...register(`links.${i}.label`)}
                              invalid={!!errors.links?.[i]?.label}
                            />
                          </FormField>
                          <FormField label="URL" error={errors.links?.[i]?.url?.message}>
                            <Input
                              placeholder="https://..."
                              {...register(`links.${i}.url`)}
                              invalid={!!errors.links?.[i]?.url}
                            />
                          </FormField>
                        </div>
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {errors.links?.message && <p className="text-xs text-red-500">{errors.links.message}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tarifas"
            subtitle="Elegí qué servicios mostrar en la página pública para atraer nuevos pacientes (opcional)."
          />
          <CardBody className="space-y-2">
            {tariffsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : clinicTariffs.length === 0 ? (
              <EmptyHint
                icon={<Tags className="size-4" />}
                text="No tenés tarifas cargadas. Creálas en la sección Tarifas para poder mostrarlas acá."
              />
            ) : (
              clinicTariffs.map((tariff) => (
                <SelectableTariff
                  key={tariff.id}
                  tariff={tariff}
                  selected={selectedIds.includes(tariff.id)}
                  onToggle={() => toggleTariff(tariff.id)}
                />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contacto" subtitle="Cómo te pueden escribir o encontrar." />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="WhatsApp"
                hint="Número completo con código de país, ej. 5491123456789"
                error={errors.whatsapp?.message}
              >
                <Input
                  inputMode="tel"
                  placeholder="+54 9 11 2345-6789"
                  {...register('whatsapp')}
                  invalid={!!errors.whatsapp}
                />
              </FormField>
              <FormField label="Email de contacto" error={errors.email?.message}>
                <Input
                  type="email"
                  placeholder="hola@tuconsultorio.com"
                  {...register('email')}
                  invalid={!!errors.email}
                />
              </FormField>
            </div>
            <FormField label="Dirección" error={errors.address?.message}>
              <Input placeholder="Calle 123, Ciudad" {...register('address')} invalid={!!errors.address} />
            </FormField>
            <FormField label="Horarios" error={errors.openingHours?.message}>
              <Input
                placeholder="Lun a Vie 9 a 18 hs · Sáb 9 a 13 hs"
                {...register('openingHours')}
                invalid={!!errors.openingHours}
              />
            </FormField>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Guardar
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4">
        <Text variant="label" className="mb-2">
          Vista previa
        </Text>
        <p className="mb-3 text-xs text-zinc-500">
          Así se ve tu página pública. Los cambios se aplican en vivo mientras editás.
        </p>
        <div
          style={previewStyle}
          className="overflow-hidden rounded-[var(--radius-card)] border border-zinc-800 shadow-sm"
        >
          <PublicClinicView data={previewData} clinicName={clinic.name} />
        </div>
      </div>
    </form>
  )
}

function SortableRow({
  id,
  onRemove,
  removeLabel,
  children,
}: {
  id: string
  onRemove: () => void
  removeLabel: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-2',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        className="mt-7 shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="mt-7 shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function SelectableTariff({
  tariff,
  selected,
  onToggle,
}: {
  tariff: Tariff
  selected: boolean
  onToggle: () => void
}) {
  const Icon = tariffIconMeta(tariff.icon).icon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected
          ? 'border-brand-500 bg-brand-50'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          selected ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-500',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-800">{tariff.name}</span>
          {!tariff.active && <Badge tone="neutral">Inactiva</Badge>}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          {tariffKindLabel(tariff.kind)} · {formatCurrency(tariff.price)}
        </span>
      </span>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border',
          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300 bg-white',
        )}
      >
        {selected && <Check className="size-3.5" />}
      </span>
    </button>
  )
}

function EmptyHint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-surface-muted px-3 py-4 text-sm text-zinc-500">
      <span className="text-zinc-400">{icon}</span>
      {text}
    </div>
  )
}
