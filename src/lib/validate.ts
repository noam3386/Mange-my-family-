export function sanitizeText(text: string, maxLength = 200): string {
  return text.trim().slice(0, maxLength)
}

export function validateRequired(value: string, fieldName: string): void {
  if (!value || !value.trim()) throw new Error(`${fieldName} לא יכול להיות ריק`)
}

export function validateLength(value: string, max: number, fieldName: string): void {
  if (value.trim().length > max) throw new Error(`${fieldName} ארוך מדי (מקסימום ${max} תווים)`)
}

export function validatePoints(points: number): number {
  const n = Math.floor(Number(points))
  if (isNaN(n) || n < 0) return 0
  if (n > 100) return 100
  return n
}

export function validateQuantity(qty: number): number {
  const n = Math.floor(Number(qty))
  if (isNaN(n) || n < 1) return 1
  if (n > 999) return 999
  return n
}

export function validateInviteCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length !== 6) throw new Error('קוד הזמנה חייב להיות 6 תווים')
  return clean
}
