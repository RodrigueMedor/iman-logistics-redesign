export type DemoEmployeeAccount = {
  id: string
  fullName: string
  email: string
  password: string
  active: boolean
}

const storageKey = 'iman-local-employee-accounts'

export function getDemoEmployees(): DemoEmployeeAccount[] {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '[]') as DemoEmployeeAccount[]
  } catch {
    return []
  }
}

export function createDemoEmployee(input: Omit<DemoEmployeeAccount, 'id' | 'active'>) {
  const accounts = getDemoEmployees()
  if (accounts.some(account => account.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('An employee with this email already exists.')
  }
  const account: DemoEmployeeAccount = {
    ...input,
    email: input.email.toLowerCase(),
    id: `local-employee-${Date.now()}`,
    active: true,
  }
  window.localStorage.setItem(storageKey, JSON.stringify([...accounts, account]))
  return account
}

export function updateDemoEmployee(id: string, updates: Partial<Pick<DemoEmployeeAccount, 'fullName' | 'email' | 'password' | 'active'>>) {
  const accounts = getDemoEmployees()
  const current = accounts.find(account => account.id === id)
  if (!current) throw new Error('Employee account not found.')
  const nextEmail = updates.email?.toLowerCase() ?? current.email
  if (accounts.some(account => account.id !== id && account.email === nextEmail)) throw new Error('Another employee already uses this email.')
  const updated = { ...current, ...updates, email: nextEmail }
  window.localStorage.setItem(storageKey, JSON.stringify(accounts.map(account => account.id === id ? updated : account)))
  return updated
}

export function deleteDemoEmployee(id: string) {
  const accounts = getDemoEmployees()
  if (!accounts.some(account => account.id === id)) throw new Error('Employee account not found.')
  window.localStorage.setItem(storageKey, JSON.stringify(accounts.filter(account => account.id !== id)))
}
