export type PersonApiRecord = {
  id?: number
  firstname?: string | null
  lastname?: string | null
  first_name?: string | null
  last_name?: string | null
  firstName?: string | null
  lastName?: string | null
  slack_id?: string | null
  slackId?: string | null
  [key: string]: unknown
}

export type NormalizedPerson = {
  id: number
  firstName?: string
  lastName?: string
  slackId?: string
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value || undefined
  }
  if (value === null || value === undefined) {
    return undefined
  }
  return String(value)
}

export const normalizePerson = (
  input: unknown
): NormalizedPerson | null => {
  if (typeof input !== "object" || input === null) {
    return null
  }

  const record = input as PersonApiRecord
  const id = record.id

  if (typeof id !== "number" || Number.isNaN(id)) {
    return null
  }

  const firstName =
    toOptionalString(record.firstname) ??
    toOptionalString(record.first_name) ??
    toOptionalString(record.firstName)

  const lastName =
    toOptionalString(record.lastname) ??
    toOptionalString(record.last_name) ??
    toOptionalString(record.lastName)

  const slackId =
    toOptionalString(record.slack_id) ?? toOptionalString(record.slackId)

  return {
    id,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    slackId: slackId ?? undefined,
  }
}

export const personDisplayName = (person?: NormalizedPerson | null) => {
  if (!person) {
    return "Unknown person"
  }
  const name = [person.firstName, person.lastName]
    .filter((segment) => segment && segment.trim().length)
    .join(" ")
    .trim()

  if (name.length > 0) {
    return name
  }

  return `Person #${person.id}`
}
