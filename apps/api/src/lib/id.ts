import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21)

export function generateId(): string {
  return nanoid()
}

export function generateTicketNumber(year: number, counter: number): string {
  const padded = String(counter).padStart(6, '0')
  return `CR-${year}-${padded}`
}
