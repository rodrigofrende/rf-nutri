# RF NUTRI

Software de gestión para nutricionistas — multi-tenant, mobile-first, hecho en Argentina.
App hermana de RF FIT (gimnasios) y RF TURNOS (clínicas): misma arquitectura probada, dominio nutrición.

**Producción:** `https://nutri.rf-platform.com` (pendiente de configurar)

## Qué hace

- **Pacientes** con ficha clínica completa: objetivo, antecedentes, alergias, medicación, hábitos, obra social.
- **Antropometría**: peso, talla, perímetros y pliegues (protocolo de 8 sitios); derivados calculados en el cliente — IMC, ICC, % grasa (Durnin-Womersley y Faulkner vía Siri), masa grasa/magra, TMB (Mifflin-St Jeor y Harris-Benedict) y GET. Evolución en gráficos.
- **Planes alimentarios**: días → 6 comidas → ítems con cantidad y medidas caseras; kcal y macros en vivo contra el objetivo; plantillas, duplicar y asignar.
- **Alimentos**: catálogo propio por consultorio + seed de ~210 alimentos argentinos (estilo ARGENFOODS/SARA), importable e idempotente.
- **App del paciente**: su plan, diario de comidas con fotos, peso autorreportado, check-in semanal (energía/sueño/hambre/adherencia), evolución, turnos y pagos.
- **Agenda** de turnos con confirmación del paciente.
- **Cobros por servicio** (consulta/tratamiento/antropometría): historial general del consultorio + historial del paciente. Sin cuotas ni morosidad a nivel paciente.
- **Web pública por consultorio** (`/n/:clinicId`) + **landing de marketing** en `/`.
- **Super-admin**: alta de consultorios, planes de la plataforma y cuotas SaaS (con vencimiento y suspensión), emails vetados.
- **Configuración por consultorio**: mostrar calorías/macros o no, gramos vs medidas caseras, fotos del diario on/off, qué secciones y fórmulas de antropometría usar.

## Stack

React 19 · Vite · TypeScript · Tailwind 4 (CSS-first) · Firebase 12 (Auth + Firestore, sin Storage ni Functions) · TanStack Query 5 · react-router-dom 7 · react-hook-form + zod · recharts · dnd-kit · pnpm.

Deploy en Netlify (`netlify.toml`, `public/_headers`, `public/_redirects`). `firebase.json` solo para rules/índices/emuladores.

## Arranque

```bash
pnpm install
pnpm dev:test        # modo demo: backend en memoria, sin Firebase (identidades demo)
```

Con Firebase real: copiar `.env.example` a `.env.local`, completar credenciales y `pnpm dev`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | dev server (puerto 3000) |
| `pnpm dev:test` | dev en modo demo (datos en memoria) |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm test:unit` | vitest sobre `tests/unit` (fórmulas de antropometría y nutrición) |
| `pnpm test:rules` | rules de Firestore contra el emulador |
| `pnpm test:e2e` | Playwright contra el modo demo |
| `pnpm set-super-admin` | setea el custom claim de super-admin (Admin SDK) |

## Arquitectura (resumen)

- **Tenant** = consultorio: `clinics/{clinicId}`, todo anidado debajo. El tenant activo no va en la URL: lo deriva `TenantProvider` (+ localStorage).
- **Roles**: por tenant `admin` (nutricionista) / `user` (paciente) en el member doc; `superAdmin` global por custom claim.
- **Onboarding invite+claim**: el admin crea el member con `uid: ''` + índice de login en un batch; el paciente lo reclama en su primer ingreso.
- **Índices para rules**: `users/{uid}/clinicMemberships/{clinicId}` (membresía) y `memberLoginIndex/{emailKey}` (ruteo pre-auth del login, world-readable y sin PII de más).
- **Self-writes del paciente** (diario/peso/check-ins) validados por forma y doc-id determinístico en `firestore.rules`; antropometría y notas las escribe solo el admin (notas: ni el paciente las lee).
- **Pagos en dos niveles**: cobros a pacientes (`clinics/{id}/payments`, admin) y cuotas SaaS (`clinics/{id}/subscriptionPayments` + `clinic.subscription`, super-admin).
- **Imágenes** inline como data URLs comprimidas (≤150 KB) — sin Firebase Storage. Fotos del paciente SOLO en el diario.
- **Demo mode** completo en `src/demo/` (es contra lo que corren los e2e).

## Roadmap

Fuera del MVP, en orden tentativo: recordatorio de 24 horas (R24) estructurado, export PDF con marca, ISAK completo + somatotipo/somatocarta, import de bioimpedancia (InBody), curvas OMS pediátricas, dieta visual, Mercado Pago, recordatorios automáticos por WhatsApp, chat nutricionista↔paciente, laboratorios, IA (generación de planes, notas de consulta, foto-análisis), consentimiento informado + audit log (Leyes 25.326/26.529/27.706).

## TO-DOs de infraestructura

- Crear el proyecto de Firebase, completar `.firebaserc`/`.env.local`, activar App Check y deployar `firestore.rules` + `firestore.indexes.json`.
- Badge `public/brand/nutri-tag.png` definitivo (el actual es un placeholder generado) y OG image final.
- Sitio en Netlify + dominio `nutri.rf-platform.com`.
- Registrar el universo NUTRI (y TURNOS) en rf-hub.
