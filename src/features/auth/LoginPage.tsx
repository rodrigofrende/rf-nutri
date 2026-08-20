import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Timestamp } from 'firebase/firestore'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, ShieldCheck, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { env } from '@/config/env'
import { queryKeys } from '@/hooks/queryKeys'
import {
  diagnoseLoginMiss,
  getMemberLogin,
  loginMissMessage,
  updateMemberAuthStatus,
  type LoginMiss,
} from '@/services/memberLoginService'
import { emailDomain } from '@/utils/loginEmail'
import { whatsappLink } from '@/utils/contact'
import { useClinicPresentation } from '@/hooks/useClinicPresentation'
import { getOne } from '@/services/firestore'
import { paths } from '@/services/paths'
import type { ClaimedMembership } from '@/services/membershipsService'
import { claimMembership, claimPendingMemberships } from '@/services/membershipsService'
import { extractAuthCode, mapAuthError } from '@/utils/authErrors'
import { extractFirestoreCode, mapFirestoreError } from '@/utils/firestoreErrors'
import { BrandLockup, Button, Card, FormField, Input, PasswordInput, Text } from '@/components/ui'
import { publicClinicRoute, ROUTES } from '@/routes/routePaths'
import { persistActiveClinicId } from '@/config/storageKeys'
import { reportOperational } from '@/utils/errorReporting'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
type LoginStep = 'email' | 'password'

export function LoginPage() {
  const { user, loginEmail, loginGoogle, setDemoIdentity, sendPasswordReset } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [step, setStep] = useState<LoginStep>('email')
  const [resolvedEmail, setResolvedEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [forgotSending, setForgotSending] = useState(false)
  const [createAccessLoading, setCreateAccessLoading] = useState(false)
  // Diagnóstico del último intento fallido de "primera vez". La sugerencia que
  // trae adentro sólo existe si está confirmada contra el índice, así que nunca
  // se le ofrece al paciente un email inventado.
  const [miss, setMiss] = useState<LoginMiss | null>(null)
  const canUseGoogle = env.googleLoginEnabled
  const redirect = new URLSearchParams(location.search).get('redirect')
  // Solo rutas internas: rechazar también '//' y '/\' (URLs protocolo-relativas)
  // para no habilitar un open-redirect si algún día se usara window.location.
  const safeRedirect =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/\\')
      ? redirect
      : '/'
  // Si llegó escaneando el QR de check-in, el redirect nos dice a QUÉ clinic. Sirve
  // para dos cosas: darle contexto (si no, es un login anónimo que no explica por
  // qué está ahí) y, si su email no está dado de alta, poder ofrecerle el
  // contacto del clinic en vez de dejarlo en un callejón sin salida.
  // `publicProfiles` es world-readable, así que esto funciona sin sesión.
  const checkInClinicId = /^\/check-in\/([^/?#]+)/.exec(safeRedirect)?.[1] ?? ''
  const { data: checkInClinic } = useClinicPresentation(checkInClinicId)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Ya autenticado (login real o demo) → a la home; HomeRedirect resuelve por rol.
  if (user) return <Navigate to={safeRedirect} replace />

  const onSubmit = async (values: FormValues) => {
    try {
      const email = values.email.trim().toLowerCase()
      if (step === 'email') {
        // El índice de login ya NO expone authStatus (para no filtrar qué pacientes
        // están sin reclamar), así que no auto-ruteamos el primer acceso: el paciente
        // pasa al paso contraseña, donde hay un enlace "¿Primera vez?".
        setResolvedEmail(email)
        setValue('password', '')
        setStep('password')
        return
      }

      if (!values.password) {
        notify('Ingresá tu contraseña', 'error')
        return
      }
      const login = await getMemberLogin(resolvedEmail || email)
      const loggedUser = await loginEmail(resolvedEmail || email, values.password)
      const claimed = new Map<string, ClaimedMembership>()

      // 1) Claim principal del índice de login (si falla, no lo silenciamos).
      if (login) {
        const direct = await claimMembership(loggedUser, login.clinicId, login.memberId)
        if (direct) claimed.set(`${direct.clinicId}:${direct.memberId}`, direct)
      }

      // 2) Claims adicionales por el mismo email (multi-tenant), en best-effort.
      try {
        const pending = await claimPendingMemberships(loggedUser)
        pending.forEach((membership) => {
          claimed.set(`${membership.clinicId}:${membership.memberId}`, membership)
        })
      } catch {
        // Si el claim principal ya salió bien, no bloqueamos el login por claims secundarios.
      }

      if (!claimed.size && login) {
        throw new Error('No se pudo vincular tu acceso a ningún consultorio')
      }

      await Promise.all(
        [...claimed.values()].map(async (membership) => {
          // El claim ya trae el member leído; solo re-leemos si faltara.
          const member =
            membership.member ??
            (await getOne<Member>(paths.member(membership.clinicId, membership.memberId)))
          if (!member || member.authStatus === 'active' || member.authStatus === 'password_change_required') return
          await updateMemberAuthStatus(
            membership.clinicId,
            membership.memberId,
            'active',
            { passwordUpdatedAt: Timestamp.now() },
            { member, clinicName: login?.clinicId === membership.clinicId ? login.clinicName : undefined },
          )
        }),
      )

      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships(loggedUser.uid) })
      if (claimed.size === 1) {
        persistActiveClinicId([...claimed.values()][0].clinicId)
      }
      let shouldForcePasswordChange = false
      if (login?.clinicId && login?.memberId) {
        const member =
          claimed.get(`${login.clinicId}:${login.memberId}`)?.member ??
          (await getOne<Member>(paths.member(login.clinicId, login.memberId)))
        shouldForcePasswordChange = member?.authStatus === 'password_change_required'
      }
      if (shouldForcePasswordChange) {
        navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(resolvedEmail || email)}&mode=change`)
      }
    } catch (err) {
      const message = extractAuthCode(err)
        ? mapAuthError(err)
        : extractFirestoreCode(err)
          ? mapFirestoreError(err, 'No se pudo sincronizar tu acceso al consultorio')
          : err instanceof Error && err.message.includes('vincular tu acceso')
            ? 'Tu cuenta existe, pero no pudimos asociarla a un consultorio. Pedile al super-admin que revise tu alta.'
            : mapAuthError(err)
      notify(message, 'error')
    }
  }

  const onLegacyRegister = async (identity: 'superadmin' | 'admin' | 'paciente') => {
    if (setDemoIdentity) setDemoIdentity(identity)
  }

  const resetStep = () => {
    setStep('email')
    setResolvedEmail('')
    setMiss(null)
    setValue('password', '')
  }

  /** `emailOverride` viene del botón de sugerencia cuando el paciente tipeó mal. */
  const goToCreatePassword = async (emailOverride?: string) => {
    const target = emailOverride ?? resolvedEmail
    if (!target || createAccessLoading) return
    setCreateAccessLoading(true)
    setMiss(null)
    if (emailOverride) {
      setResolvedEmail(emailOverride)
      setValue('email', emailOverride)
    }
    try {
      const login = await getMemberLogin(target)
      if (!login) {
        const diagnosis = await diagnoseLoginMiss(target)
        reportOperational('login-index-miss', 'Alta de contraseña: no hay índice de login', undefined, {
          email: target,
          motivo: diagnosis.reason,
          sug: diagnosis.suggestion ? emailDomain(diagnosis.suggestion) : undefined,
          paso: 'primera-vez',
          // Saber que venía del QR es lo que distingue "paciente confundido" de
          // "alguien parado en la puerta que no está dado de alta".
          qr: checkInClinicId ? 'si' : undefined,
        })
        setMiss(diagnosis)
        // Sin sugerencia, el bloque inline de abajo ya explica lo mismo y encima
        // nombra al clinic y ofrece acciones: el toast sería el mismo texto dos
        // veces en pantalla.
        if (diagnosis.suggestion) notify(loginMissMessage(diagnosis), 'error')
        return
      }
      navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(target)}&mode=create`, {
        state: { login },
      })
    } catch (err) {
      reportOperational(
        'login-index-read',
        'No se pudo leer el índice de login',
        extractFirestoreCode(err) ?? 'unknown',
        { email: target, paso: 'primera-vez' },
      )
      notify(mapFirestoreError(err, 'No pudimos verificar tu acceso. Probá de nuevo.'), 'error')
    } finally {
      setCreateAccessLoading(false)
    }
  }

  // Olvidó la contraseña (ya tiene cuenta): dispara el email de restablecimiento.
  // Honesto con el caso "alias del clinic": si el email no es real, no le llega y
  // tiene que pedirle el reseteo a su consultorio.
  const handleForgot = async () => {
    if (!resolvedEmail || forgotSending) return
    setForgotSending(true)
    try {
      await sendPasswordReset(resolvedEmail)
      notify(
        'Si tu email es válido, te enviamos un link para restablecerla (revisá spam). Si tu acceso es un usuario del consultorio, pedile a tu clinic que te lo resetee.',
        'success',
      )
    } catch (err) {
      notify(mapAuthError(err, 'No pudimos enviar el email de restablecimiento'), 'error')
    } finally {
      setForgotSending(false)
    }
  }

  // Mensaje pre-armado: el paciente no tiene que explicar nada, sólo enviar.
  const clinicWhatsapp = whatsappLink(
    checkInClinic?.whatsapp,
    `Hola! Quise marcar asistencia con ${resolvedEmail} y no me reconoce. ¿Me pueden dar de alta?`,
  )

  const onPasswordSubmit = handleSubmit(onSubmit)

  const onGoogle = async () => {
    setGoogleLoading(true)
    try {
      await loginGoogle()
    } catch (err) {
      notify(mapAuthError(err), 'error')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Link to="/" aria-label="Ir a la web de RF NUTRI" className="transition-opacity hover:opacity-80">
            <BrandLockup variant="onLight" size="lg" />
          </Link>
          <Text variant="caption" className="mt-6">
            {checkInClinic?.name
              ? `Ingresá para marcar asistencia en ${checkInClinic.name}`
              : 'Ingresá con tu email de acceso'}
          </Text>
        </div>

        <Card className="p-5">
          {step === 'password' && (
            <button
              type="button"
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-zinc-500 hover:text-zinc-800"
              onClick={resetStep}
              aria-label="Volver al email"
            >
              <ArrowLeft className="size-4" />
              Cambiar email
            </button>
          )}

          {env.demoMode && setDemoIdentity && (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
              <p className="mb-2 text-xs font-medium text-brand-700">
                Modo demo · datos de ejemplo en memoria (TigerFit)
              </p>
              <div className="space-y-2">
                <Button fullWidth leftIcon={<Crown className="size-4" />} onClick={() => onLegacyRegister('superadmin')}>
                  Entrar al management (Super admin)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" leftIcon={<ShieldCheck className="size-4" />} onClick={() => onLegacyRegister('admin')}>
                    Entrar como Admin
                  </Button>
                  <Button variant="secondary" leftIcon={<User className="size-4" />} onClick={() => onLegacyRegister('paciente')}>
                    Entrar como Paciente
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onPasswordSubmit} className="mt-4 space-y-4">
            <FormField label="Email" error={errors.email?.message} required>
              <Input
                type="email"
                placeholder="usuario@consultorio.com"
                invalid={!!errors.email}
                disabled={step === 'password'}
                {...register('email')}
              />
            </FormField>
            {step === 'password' && (
              <FormField label="Contraseña" required>
                <PasswordInput placeholder="••••••••" {...register('password')} />
              </FormField>
            )}

            <Button type="submit" fullWidth loading={isSubmitting}>
              {step === 'email' ? 'Continuar' : 'Entrar'}
            </Button>

            {step === 'password' && (
              <div className="space-y-1.5 pt-1 text-center">
                <button
                  type="button"
                  onClick={() => void goToCreatePassword()}
                  disabled={createAccessLoading}
                  className="block w-full text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
                >
                  {createAccessLoading ? 'Verificando acceso...' : '¿Primera vez? Creá tu contraseña'}
                </button>
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={forgotSending}
                  className="block w-full text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Sugerencia de typo. No se autocorrige a propósito: hace falta un
                click explícito para no mandar al paciente al alta de otra cuenta. */}
            {miss?.suggestion && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-sm text-amber-900">
                  ¿Quisiste decir <span className="font-semibold break-all">{miss.suggestion}</span>?
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="mt-2"
                  loading={createAccessLoading}
                  onClick={() => void goToCreatePassword(miss.suggestion)}
                >
                  Sí, usar ese email
                </Button>
              </div>
            )}

            {/* Salida del callejón: el email no está dado de alta y no hay
                corrección posible. Sin esto, quien escanea el QR sin estar dado
                de alta queda mirando un error sin ninguna acción disponible. */}
            {miss && !miss.suggestion && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
                <p className="text-sm text-zinc-700">
                  {checkInClinic?.name
                    ? `Ese email no está dado de alta en ${checkInClinic.name}.`
                    : 'Ese email no está dado de alta.'}{' '}
                  Pedile al consultorio que te agregue o que te diga con qué email entrás.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {clinicWhatsapp && (
                    <a
                      href={clinicWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-brand-600 text-sm font-medium text-white"
                    >
                      Escribirle al consultorio
                    </a>
                  )}
                  {checkInClinicId && (
                    <Link
                      to={publicClinicRoute(checkInClinicId)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Ver la página de {checkInClinic?.name ?? 'el consultorio'}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </form>

          {canUseGoogle && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200" />o<span className="h-px flex-1 bg-zinc-200" />
              </div>

              <Button variant="secondary" fullWidth loading={googleLoading} onClick={onGoogle}>
                <GoogleIcon /> Continuar con Google
              </Button>
            </>
          )}
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Conocé RF NUTRI
          </Link>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
