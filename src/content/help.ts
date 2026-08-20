export type PageHelpIcon =
  | 'calendar'
  | 'wallet'
  | 'user'
  | 'users'
  | 'utensils'
  | 'copy'
  | 'apple'
  | 'tags'
  | 'ruler'
  | 'activity'
  | 'notebook'
  | 'heart'
  | 'check'
  | 'building'
  | 'chart'

export type PageHelpChip = {
  label: string
  hint: string
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'brand' | 'violet'
}

export type PageHelpItem = {
  question: string
  answer: string
  icon?: PageHelpIcon
  chips?: PageHelpChip[]
}

export const AGENDA_HELP: PageHelpItem[] = [
  {
    icon: 'calendar',
    question: 'Estados del turno',
    answer: 'El menú solo ofrece el siguiente paso. Si te equivocaste, corregilo desde Editar.',
    chips: [
      { label: 'Programado', hint: 'Agendado, aún no confirmado', tone: 'amber' },
      { label: 'Confirmado', hint: 'Va a venir', tone: 'green' },
      { label: 'Completado', hint: 'La consulta se hizo', tone: 'neutral' },
      { label: 'Ausente', hint: 'No vino', tone: 'red' },
      { label: 'Cancelado', hint: 'Se suspendió', tone: 'neutral' },
    ],
  },
  {
    icon: 'wallet',
    question: '¿Completar cobra?',
    answer:
      'No. Completar solo deja constancia de que vino. El pago se carga en Cobros. La tarifa del turno es una referencia, no un cobro.',
  },
  {
    icon: 'user',
    question: 'Ausente o sin pagar',
    answer:
      'Si no vino, marcalo ausente: no cuenta como consulta hecha. Si vino y no pagó, completalo igual y registrá el cobro cuando lo tengas. No hay cuenta corriente automática.',
  },
]

export const PAYMENTS_HELP: PageHelpItem[] = [
  {
    icon: 'wallet',
    question: '¿Qué se registra acá?',
    answer:
      'Solo dinero que ya recibiste. Completar un turno o elegir una tarifa no genera un cobro solo.',
  },
  {
    icon: 'user',
    question: '¿Quién no pagó?',
    answer:
      'Todavía no hay un listado de deudores. Un turno puede estar completado y no aparecer acá hasta que registres el cobro.',
  },
]

export const PATIENTS_HELP: PageHelpItem[] = [
  {
    icon: 'users',
    question: 'Alta del paciente',
    answer:
      'Con el email de acceso puede entrar a ver su plan, diario y turnos. Sin email queda solo en tu consultorio, como ficha interna.',
  },
  {
    icon: 'user',
    question: 'Qué ve cada uno',
    answer:
      'Vos ves ficha, antropometría, planes y cobros. El paciente no ve notas clínicas ni lo que marques como privado en preferencias.',
  },
]

export const MEAL_PLANS_HELP: PageHelpItem[] = [
  {
    icon: 'utensils',
    question: 'Planes y plantillas',
    answer: 'Son dos listas distintas: un plan se asigna a un paciente; una plantilla se copia para armar planes nuevos.',
    chips: [
      { label: 'Plan', hint: 'Se asigna y el paciente lo ve', tone: 'brand' },
      { label: 'Plantilla', hint: 'Se reutiliza, no se asigna', tone: 'violet' },
    ],
  },
  {
    icon: 'copy',
    question: 'Duplicar o guardar plantilla',
    answer:
      'Duplicar crea un borrador. Guardar como plantilla deja el original y arma una copia reutilizable.',
  },
]

export const MEAL_PLAN_EDITOR_HELP: PageHelpItem[] = [
  {
    icon: 'utensils',
    question: 'Cómo se arma',
    answer:
      'El día tipo es la base. Podés agregar días distintos (entrenamiento, descanso). Los alimentos salen de tu catálogo.',
  },
  {
    icon: 'check',
    question: 'Guardar y asignar',
    answer:
      'Guardar deja el borrador. Asignar y activar se lo muestra al paciente. Una plantilla no se asigna: se copia a un plan nuevo.',
  },
]

export const FOODS_HELP: PageHelpItem[] = [
  {
    icon: 'apple',
    question: 'Valores por 100 g',
    answer:
      'Las kcal y macros se cargan por 100 g o 100 ml. En el plan elegís la porción y se calcula sola.',
  },
  {
    icon: 'check',
    question: 'Activo e importar',
    answer:
      'Si lo desactivás, no aparece al armar planes. Importar catálogo suma alimentos de partida; no pisa los que ya cargaste.',
  },
]

export const TARIFFS_HELP: PageHelpItem[] = [
  {
    icon: 'tags',
    question: 'Icono y tipo',
    answer:
      'El icono es solo visual. El tipo (consulta, tratamiento, etc.) es la clasificación que usás en cobros y turnos.',
  },
  {
    icon: 'wallet',
    question: 'No cobra sola',
    answer:
      'La tarifa precarga el monto al registrar un cobro o un turno. El pago se confirma en Cobros.',
  },
]

export const ANTHROPOMETRY_HELP: PageHelpItem[] = [
  {
    icon: 'ruler',
    question: 'Qué se calcula solo',
    answer:
      'Cargás medidas crudas (peso, talla, pliegues, perímetros). IMC, % de grasa, TMB y GET se calculan al mostrarlos.',
  },
  {
    icon: 'activity',
    question: 'Qué hace falta',
    answer:
      'Sexo y fecha de nacimiento van en la ficha. El nivel de actividad sale de ahí también, para el GET (TMB × actividad).',
  },
]

export const CHECKIN_HELP: PageHelpItem[] = [
  {
    icon: 'heart',
    question: 'Para qué es',
    answer:
      'Es un pantallazo semanal para tu nutri: energía, hambre, ánimo. No reemplaza el diario de comidas.',
  },
  {
    icon: 'check',
    question: 'Podés corregirlo',
    answer: 'Si ya lo enviaste, lo podés ajustar hasta el domingo de esa semana.',
  },
]

export const DIARY_HELP: PageHelpItem[] = [
  {
    icon: 'notebook',
    question: 'Qué registrar',
    answer:
      'Por cada comida podés marcar cómo te fue, y aparte anotar el peso. Tu nutri lo ve en la ficha; no cambia el plan solo.',
  },
]

export const MY_APPOINTMENTS_HELP: PageHelpItem[] = [
  {
    icon: 'calendar',
    question: 'Confirmar asistencia',
    answer:
      'Si el turno está pendiente, confirmá que vas. Completado o ausente lo marca tu nutri después de la consulta.',
  },
]

export const MY_PLAN_HELP: PageHelpItem[] = [
  {
    icon: 'utensils',
    question: 'Qué plan ves',
    answer:
      'Solo el plan que tu nutri dejó activo. Si hay más de un día (entrenamiento, descanso), cambiá de día arriba.',
  },
  {
    icon: 'check',
    question: 'Cantidades y cambios',
    answer:
      'Las porciones pueden verse en tazas, gramos o ambos, según el consultorio. Acá no se edita: si algo no cierra, escribilé a tu nutri.',
  },
]

export const MY_PROGRESS_HELP: PageHelpItem[] = [
  {
    icon: 'chart',
    question: 'De dónde salen los gráficos',
    answer:
      'El peso lo cargás en el diario. Las medidas (cintura, pliegues, etc.) las toma tu nutri. El check-in semanal también suma si lo vas completando.',
  },
  {
    icon: 'ruler',
    question: 'Qué no aparece',
    answer: 'Las notas clínicas y lo privado del consultorio no se ven acá. Esto es tu evolución, no la ficha completa.',
  },
]

export const MY_PAYMENTS_HELP: PageHelpItem[] = [
  {
    icon: 'wallet',
    question: 'Qué se lista',
    answer:
      'Pagos que el consultorio ya registró. Un turno hecho no aparece acá hasta que ellos carguen el cobro.',
  },
  {
    icon: 'calendar',
    question: 'Total del año',
    answer: 'Es la suma de lo abonado en el año en curso, no un resumen de deudas.',
  },
]

export const MY_PROFILE_HELP: PageHelpItem[] = [
  {
    icon: 'user',
    question: 'Qué podés editar',
    answer:
      'Nombre, teléfono y fecha de nacimiento. El email de acceso lo gestiona el consultorio.',
  },
  {
    icon: 'check',
    question: 'Contraseña',
    answer:
      'Se cambia estando logueado. Si la olvidaste del todo, pedile al consultorio que te reenvíe el acceso.',
  },
]

export const MY_CONTACT_HELP: PageHelpItem[] = [
  {
    icon: 'building',
    question: 'Qué hay acá',
    answer: 'Presentación del consultorio: dirección, horarios y cómo escribirles (WhatsApp, email, redes).',
  },
  {
    icon: 'heart',
    question: 'Si está vacío',
    answer: 'Todavía no cargaron esa info. Usá el canal con el que ya te hablan hasta que aparezca.',
  },
]

export const FICHA_APPOINTMENTS_HELP: PageHelpItem[] = [AGENDA_HELP[0], AGENDA_HELP[1]]

export const FICHA_PAYMENTS_HELP: PageHelpItem[] = PAYMENTS_HELP

export const FICHA_DIARY_HELP: PageHelpItem[] = [
  {
    icon: 'notebook',
    question: 'Qué ves acá',
    answer:
      'El paciente registra cada comida y el peso en Mi diario. No se edita desde la ficha y no cambia el plan solo.',
  },
]

export const FICHA_CHECKIN_HELP: PageHelpItem[] = [
  {
    icon: 'heart',
    question: 'Qué ves acá',
    answer:
      'Lo completa el paciente cada semana. Podés comparar con la semana anterior. No reemplaza el diario de comidas.',
  },
]

export const FICHA_PLAN_HELP: PageHelpItem[] = [
  {
    icon: 'utensils',
    question: 'Plan activo',
    answer:
      'Solo el plan activo lo ve el paciente. Borradores y archivados quedan en esta ficha. Las plantillas viven en Planes, no acá.',
  },
]

