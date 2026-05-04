import type { UIMessage } from 'ai'
import type { GenerateDailyPlanData, LogCheckInData, TodaySummaryData } from '@/lib/ai/habitquest-domain-service'

export function extractLatestUserText(messages: UIMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')

  if (!latestUserMessage) {
    return ''
  }

  return latestUserMessage.parts
    .filter((part): part is Extract<(typeof latestUserMessage.parts)[number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

export function isPlanRequest(text: string) {
  return /\b(plan|planific|acciones|organiza|organizar|hoy)\b/i.test(text)
}

export function isCheckInRequest(text: string) {
  return /\b(cansad|agotad|sin energia|sin energía|poca energia|poca energía|estres|estrés|abrumad|ansios|sin tiempo|poco tiempo|apurad|no llego|check-?in)\b/i.test(
    text,
  )
}

export function isSummaryRequest(text: string) {
  return /\b(resumen|progreso|puntos|estado|balance)\b/i.test(text)
}

export function formatDailyPlanMarkdown(plan: GenerateDailyPlanData) {
  const items = plan.items.length
    ? plan.items
        .map(
          (item) =>
            `${item.position}. **${item.title}** · ${item.points} pts${item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}${
              item.rationale ? `\n   - ${item.rationale}` : ''
            }`,
        )
        .join('\n')
    : '- Todavía no hay acciones cargadas para ese plan.'

  return `## Plan de hoy\n\n${plan.agentSummary ?? 'Te propongo un plan corto y concreto para hoy.'}\n\n${items}`
}

export function formatCheckInMarkdown(checkIn: LogCheckInData) {
  if (checkIn.adaptationApplied && checkIn.adaptedPlanItems.length) {
    const items = checkIn.adaptedPlanItems
      .map(
        (item) =>
          `${item.position}. **${item.title}** · ${item.points} pts${item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}${
            item.rationale ? `\n   - ${item.rationale}` : ''
          }`,
      )
      .join('\n')

    return `## Ajuste del plan\n\n${checkIn.adaptationSummary ?? 'Ya ajusté tu plan para que siga siendo realista hoy.'}\n\n${items}`
  }

  return `## Check-in guardado\n\nRegistré tu estado con intención **${checkIn.intent}**.${
    checkIn.planStatus ? ` El plan quedó en estado **${checkIn.planStatus}**.` : ''
  }`
}

export function formatTodaySummaryMarkdown(summary: TodaySummaryData) {
  const planStatus = summary.planStatus ?? 'sin plan activo'

  return `## Resumen de hoy\n\n- **Estado del plan:** ${planStatus}\n- **Puntos ganados:** ${summary.completedPoints}\n- **Puntos canjeados:** ${summary.redeemedPoints}\n- **Puntos disponibles:** ${summary.availablePoints}\n- **Items completos:** ${summary.completedItemsCount}\n- **Items pendientes:** ${summary.pendingItemsCount}${
    summary.recentCheckIn ? `\n- **Último check-in:** ${summary.recentCheckIn.message}` : ''
  }`
}

export function formatGenericCoachMarkdown(text: string) {
  const focusLine = text ? `Tomé esto como foco: _${text}_.` : 'Todavía no me diste contexto concreto.'

  return `## Próximo paso\n\n${focusLine}\n\n1. Elegí una acción chica que puedas hacer hoy.\n2. Hacela en 10-15 minutos máximo.\n3. Volvé y contame si querés ajustar el plan.`
}
