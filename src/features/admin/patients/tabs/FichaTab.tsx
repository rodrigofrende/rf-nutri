import { Pencil, Target } from 'lucide-react'
import type { Member } from '@/types'
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { formatDate, toDate } from '@/utils/format'
import { ACTIVITY_LABELS, ageAt } from '@/utils/anthropometry'
import { GOAL_TYPE_LABELS, SEX_LABELS } from '../patientLabels'

/** Bloques de texto largo de la ficha (antecedentes, hábitos): respetan saltos de línea. */
function LongText({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      {value?.trim() ? (
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-700">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm text-zinc-400">—</p>
      )}
    </div>
  )
}

/**
 * Ficha clínica del paciente en modo lectura: lo que el nutricionista mira
 * durante la consulta sin riesgo de tocar nada. Para modificar → botón Editar.
 */
export function FichaTab({ member, onEdit }: { member: Member; onEdit: () => void }) {
  const birth = toDate(member.birthDate)
  const age = birth ? ageAt(birth) : null
  const insurance = member.healthInsurance

  return (
    <div className="space-y-4">
      {/* Objetivo destacado: es el norte del tratamiento, va primero y con jerarquía */}
      <Card className="border-brand-100 bg-brand-50/50">
        <div className="flex items-start gap-3 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Target className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-brand-900">
                {member.goalType ? GOAL_TYPE_LABELS[member.goalType] : 'Objetivo sin definir'}
              </p>
              {member.targetWeightKg != null && (
                <Badge tone="brand">Meta: {member.targetWeightKg} kg</Badge>
              )}
              {member.targetKcal != null && <Badge tone="brand">{member.targetKcal} kcal/día</Badge>}
            </div>
            {member.goal?.trim() ? (
              <p className="mt-1 text-sm italic text-brand-800">“{member.goal.trim()}”</p>
            ) : (
              <p className="mt-1 text-sm text-brand-700/70">
                Todavía no registraste el objetivo en palabras del paciente.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Datos personales"
          action={
            <Button size="sm" variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={onEdit}>
              Editar
            </Button>
          }
        />
        <CardBody>
          <InfoGrid
            items={[
              { label: 'Nombre', value: member.fullName },
              { label: 'Email', value: member.email },
              ...(member.loginEmail &&
              member.loginEmail.trim().toLowerCase() !== member.email.trim().toLowerCase()
                ? [{ label: 'Email de acceso', value: member.loginEmail }]
                : []),
              { label: 'Teléfono', value: member.phone ? member.phone : '—' },
              {
                label: 'Nacimiento',
                value: birth ? `${formatDate(member.birthDate)} (${age} años)` : '—',
              },
              {
                label: 'Contraseña',
                value:
                  member.authStatus === 'pending_password'
                    ? 'Pendiente de crear'
                    : member.authStatus === 'password_change_required'
                      ? 'Cambio requerido'
                      : 'Activa',
              },
              { label: 'Alta', value: formatDate(member.startDate) },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Ficha clínica" />
        <CardBody>
          <InfoGrid
            items={[
              { label: 'Sexo', value: member.sex ? SEX_LABELS[member.sex] : '—' },
              { label: 'Talla', value: member.heightCm != null ? `${member.heightCm} cm` : '—' },
              {
                label: 'Nivel de actividad',
                value: member.activityLevel ? ACTIVITY_LABELS[member.activityLevel] : '—',
              },
              {
                label: 'Peso objetivo',
                value: member.targetWeightKg != null ? `${member.targetWeightKg} kg` : '—',
              },
              {
                label: 'Meta calórica',
                value: member.targetKcal != null ? `${member.targetKcal} kcal/día` : '—',
              },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Antecedentes y hábitos" />
        <CardBody className="space-y-4">
          <LongText label="Antecedentes / patologías" value={member.medicalHistory} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LongText label="Alergias" value={member.allergies} />
            <LongText label="Intolerancias" value={member.intolerances} />
          </div>
          <LongText label="Medicación" value={member.medications} />
          <LongText label="Hábitos" value={member.habits} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Obra social" />
        <CardBody>
          {insurance?.name ? (
            <InfoGrid
              items={[
                { label: 'Obra social', value: insurance.name },
                { label: 'Plan', value: insurance.plan || '—' },
                {
                  label: 'N° de afiliado',
                  value: insurance.memberNumber ? insurance.memberNumber : '—',
                },
              ]}
            />
          ) : (
            <p className="text-sm text-zinc-400">Sin cobertura registrada.</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
