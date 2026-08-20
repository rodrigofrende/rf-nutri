import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Mail, MessageCircle, Share2 } from 'lucide-react'
import type { ClinicTheme } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { publicClinicRoute } from '@/routes/routePaths'
import { APP_NAME } from '@/config/app'
import { canNativeShare, nativeShare, shareOrDownloadPng, socialShareLinks } from '@/utils/share'
import { drawClinicStoryImage } from '@/features/clinic-presentation/clinicStoryImage'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui'

const MENU_WIDTH = 224 // = w-56
const GAP = 8
const MARGIN = 8

/**
 * Botón "Compartir" para la página pública del consultorio. En mobile (y navegadores con
 * Web Share) ofrece el share sheet nativo; siempre da además opciones explícitas
 * (copiar link, WhatsApp, Facebook, X, email). El menú se monta en un portal con
 * `position: fixed` para no quedar tapado por contenedores con overflow.
 */
export function SharePublicClinicButton({
  clinicId,
  clinicName,
  logoURL,
  theme,
}: {
  clinicId: string
  clinicName?: string
  logoURL?: string
  theme?: ClinicTheme | null
}) {
  const { notify } = useToast()
  const url = new URL(publicClinicRoute(clinicId), window.location.origin).toString()
  const text = clinicName ? `Conocé ${clinicName} 🥗` : 'Mirá la página de nuestro consultorio 🥗'
  const links = socialShareLinks(url, text)

  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const place = () => {
    const trigger = wrapRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const menuH = menuRef.current?.offsetHeight ?? 0
    let left = r.right - MENU_WIDTH // alineado al borde derecho del botón
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - MENU_WIDTH - MARGIN)
    const below = r.bottom + GAP
    const above = r.top - GAP - menuH
    const top = below + menuH <= window.innerHeight - MARGIN || above < MARGIN ? below : above
    setPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onReflow = () => place()
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    return () => {
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const close = () => {
    setOpen(false)
    setPos(null)
  }

  const openLink = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
    close()
  }

  const doNative = async () => {
    await nativeShare({ title: clinicName ?? APP_NAME, text, url })
    close()
  }

  const writeClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* noop */
      }
      document.body.removeChild(ta)
    }
  }

  const copy = async () => {
    await writeClipboard()
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(close, 1200)
  }

  // Instagram no admite compartir un link por URL. El flujo: se genera una
  // tarjeta de historia (canvas, branding del consultorio), se comparte como IMAGEN por
  // el share sheet nativo (Instagram la ofrece con "Agregar a historia" ya
  // cargada) y el link queda copiado para pegarlo como sticker "Enlace". En
  // desktop no hay share con archivos: la imagen se descarga.
  const [generating, setGenerating] = useState(false)
  const doStoryImage = async () => {
    if (generating) return
    setGenerating(true)
    await writeClipboard()
    try {
      const blob = await drawClinicStoryImage({
        clinicName: clinicName ?? 'Nuestro consultorio',
        logoURL,
        theme,
      })
      const outcome = await shareOrDownloadPng(blob, `historia-${clinicId}.png`, {
        title: clinicName ?? APP_NAME,
        text,
      })
      if (outcome === 'shared') {
        notify('Link copiado. Pegalo en la historia con el sticker "Enlace".', 'info')
      } else if (outcome === 'downloaded') {
        notify(
          'Imagen descargada y link copiado. Subila a tu historia y pegá el link con el sticker "Enlace".',
          'info',
        )
      }
    } catch {
      notify('No se pudo generar la imagen. El link igual quedó copiado.', 'error')
    } finally {
      setGenerating(false)
    }
    close()
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <Button variant="secondary" leftIcon={<Share2 className="size-4" />} onClick={() => setOpen((v) => !v)}>
        Compartir
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_WIDTH,
            }}
            className={cn(
              'z-[100] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-xl shadow-black/25',
              pos ? '' : 'invisible',
            )}
          >
            {canNativeShare() && (
              <MenuItem icon={<Share2 className="size-4" />} onClick={doNative}>
                Compartir…
              </MenuItem>
            )}
            <MenuItem
              icon={copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              onClick={copy}
            >
              {copied ? '¡Copiado!' : 'Copiar link'}
            </MenuItem>
            <MenuItem icon={<MessageCircle className="size-4" />} onClick={() => openLink(links.whatsapp)}>
              WhatsApp
            </MenuItem>
            <MenuItem icon={<InstagramIcon />} onClick={doStoryImage}>
              {generating ? 'Generando imagen…' : 'Historia de Instagram'}
            </MenuItem>
            <MenuItem icon={<FacebookIcon />} onClick={() => openLink(links.facebook)}>
              Facebook
            </MenuItem>
            <MenuItem icon={<XIcon />} onClick={() => openLink(links.x)}>
              X (Twitter)
            </MenuItem>
            <MenuItem icon={<Mail className="size-4" />} onClick={() => openLink(links.email)}>
              Email
            </MenuItem>
          </div>,
          document.body,
        )}
    </div>
  )
}

// lucide 1.x quitó los íconos de marca; usamos SVGs inline compactos.
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H17V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.7V13h2.73v8h3.07Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M17.53 3H20.5l-6.5 7.43L21.75 21h-5.98l-4.68-6.12L5.7 21H2.73l6.95-7.95L2.5 3h6.13l4.23 5.6L17.53 3Zm-1.05 16.2h1.65L7.6 4.7H5.83l10.65 14.5Z" />
    </svg>
  )
}

function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
    >
      <span className="shrink-0 text-zinc-400">{icon}</span>
      {children}
    </button>
  )
}
