let counter = 0

function uid(): string {
  return `${Date.now()}_${++counter}`
}

export function uniqueName(base: string): string {
  return `e2e_${base}_${uid()}`
}

export function uniquePhone(): string {
  const rand = Math.floor(Math.random() * 900_000_000) + 100_000_000
  return `5511${rand}`
}

export function uniqueEmail(): string {
  return `e2e_${uid()}@test.com`
}

export function uniqueSlug(base: string): string {
  return `e2e-${base}-${uid()}`
}
