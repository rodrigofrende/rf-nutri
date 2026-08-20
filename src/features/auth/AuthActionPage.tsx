import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/providers/AuthProvider'
import { BrandLockup, Button, Card, FormField, Heading, PasswordInput, Spinner, Text } from '@/components/ui'
import { ROUTES } from '@/routes/routePaths'

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Repetí la contraseña'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' })
type FormValues = z.infer<typeof schema>

type Status = 'verifying' | 'form' | 'done' | 'error'

/**
 * Página propia (branded) para las acciones de email de Firebase Auth. Reemplaza
 * la pantalla genérica de `…firebaseapp.com/__/auth/action` cuando se setea el
 * "custom action URL" en la consola apuntando a `/auth/action` de la app.
 * Maneja el reset de contraseña (el único flujo de email que dispara la app):
 * verifica el código, pide la contraseña nueva y confirma, con estados claros.
 */
export function AuthActionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { verifyResetCode, confirmReset } = useAuth()
  const mode = params.get('mode')
  const oobCode = params.get('oobCode') ?? ''

  // Link inválido (sin mode/oobCode) → arranca en 'error' desde el estado inicial,
  // así evitamos un setState síncrono dentro del efecto.
  const invalidLink = mode !== 'resetPassword' || !oobCode
  const [status, setStatus] = useState<Status>(invalidLink ? 'error' : 'verifying')
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState(
    invalidLink ? 'El enlace no es válido. Pedile a tu consultorio que te reenvíe el email.' : '',
  )
  // Verificamos el código una sola vez, aunque el provider re-renderice.
  const startedRef = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (startedRef.current || invalidLink) return
    startedRef.current = true
    verifyResetCode(oobCode)
      .then((mail) => {
        setEmail(mail)
        setStatus('form')
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg('El enlace venció o ya se usó. Pedí uno nuevo desde el login o a tu consultorio.')
      })
  }, [invalidLink, oobCode, verifyResetCode])

  const onSubmit = async (values: FormValues) => {
    try {
      await confirmReset(oobCode, values.password)
      setStatus('done')
    } catch {
      setStatus('error')
      setErrorMsg('No pudimos cambiar la contraseña. El enlace pudo haber vencido; pedí uno nuevo.')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLockup variant="onLight" size="lg" />
        </div>

        <Card className="p-5">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Spinner />
              <Text variant="caption">Verificando el enlace…</Text>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertTriangle className="size-6" />
              </span>
              <Heading variant="card">Enlace no válido</Heading>
              <Text variant="caption">{errorMsg}</Text>
              <Button className="mt-2" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                Ir a iniciar sesión
              </Button>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </span>
              <Heading variant="card">¡Listo! Cambiaste tu contraseña</Heading>
              <Text variant="caption">Ya podés entrar con tu contraseña nueva.</Text>
              <Button className="mt-2" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                Ir a iniciar sesión
              </Button>
            </div>
          )}

          {status === 'form' && (
            <>
              <div className="mb-4 text-center">
                <Heading variant="card">Creá tu nueva contraseña</Heading>
                {email && (
                  <Text variant="caption" className="mt-1 break-all">
                    {email}
                  </Text>
                )}
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Nueva contraseña" error={errors.password?.message} required>
                  <PasswordInput placeholder="••••••••" invalid={!!errors.password} {...register('password')} />
                </FormField>
                <FormField label="Repetir contraseña" error={errors.confirm?.message} required>
                  <PasswordInput placeholder="••••••••" invalid={!!errors.confirm} {...register('confirm')} />
                </FormField>
                <Button type="submit" fullWidth loading={isSubmitting} leftIcon={<KeyRound className="size-4" />}>
                  Guardar contraseña
                </Button>
              </form>
            </>
          )}
        </Card>

        <div className="mt-6 text-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
