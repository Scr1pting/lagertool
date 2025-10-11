"use client"

import * as React from "react"
import { type ColumnDef, type Row } from "@tanstack/react-table"

import DataTable from "@/components/DataTable"
import { Button } from "@/components/ui/button"

type PersonFormState = {
  firstName: string
  lastName: string
  slackId: string
}

type PersonRow = {
  id: number
  firstName?: string
  lastName?: string
  slackId?: string
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

const defaultFormState: PersonFormState = {
  firstName: "",
  lastName: "",
  slackId: "",
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (value === null || value === undefined) {
    return undefined
  }
  const asString = String(value).trim()
  return asString.length ? asString : undefined
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const decodePerson = (input: unknown): PersonRow | null => {
  if (typeof input !== "object" || input === null) {
    return null
  }

  const tentativeId = toNumber((input as { id?: unknown }).id)
  if (tentativeId === null) {
    return null
  }

  const record = input as Record<string, unknown>

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
    id: tentativeId,
    firstName,
    lastName,
    slackId,
  }
}

const sortPersons = (data: PersonRow[]) =>
  [...data].sort((a, b) => {
    const lastComparison =
      (a.lastName ?? "").localeCompare(b.lastName ?? "", undefined, {
        sensitivity: "accent",
        numeric: true,
      })
    if (lastComparison !== 0) {
      return lastComparison
    }

    const firstComparison =
      (a.firstName ?? "").localeCompare(b.firstName ?? "", undefined, {
        sensitivity: "accent",
        numeric: true,
      })
    if (firstComparison !== 0) {
      return firstComparison
    }

    return a.id - b.id
  })

const formatPersonName = (person: PersonRow) => {
  const fullName = [person.firstName, person.lastName]
    .filter((segment) => segment && segment.trim().length)
    .join(" ")
    .trim()

  if (fullName.length > 0) {
    return fullName
  }

  return `Person #${person.id}`
}

const buildFormState = (person?: PersonRow | null): PersonFormState => ({
  firstName: person?.firstName ?? "",
  lastName: person?.lastName ?? "",
  slackId: person?.slackId ?? "",
})

export default function AddPersonPage() {
  const [form, setForm] = React.useState<PersonFormState>(defaultFormState)
  const [persons, setPersons] = React.useState<PersonRow[]>([])
  const [editingPerson, setEditingPerson] = React.useState<PersonRow | null>(
    null
  )
  const [filterValue, setFilterValue] = React.useState<string>("")

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null)

  const isEditing = Boolean(editingPerson)

  const fetchPersons = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/persons`)
      if (!response.ok) {
        throw new Error(`Failed to load persons (HTTP ${response.status})`)
      }

      const json: unknown = await response.json()

      const rawList: unknown[] = Array.isArray(json)
        ? json
        : Array.isArray((json as { persons?: unknown }).persons)
          ? ((json as { persons?: unknown }).persons as unknown[])
          : Array.isArray((json as { results?: unknown }).results)
            ? ((json as { results?: unknown }).results as unknown[])
            : []

      const parsed = rawList
        .map(decodePerson)
        .filter((person): person is PersonRow => Boolean(person))

      setPersons(sortPersons(parsed))
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load persons."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPersons()
  }, [fetchPersons])

  const updateFormValue = React.useCallback(
    (field: keyof PersonFormState) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target
        setForm((prev) => ({
          ...prev,
          [field]: value,
        }))
      },
    []
  )

  const startEdit = React.useCallback((person: PersonRow) => {
    setSubmitError(null)
    setSubmitSuccess(null)
    setEditingPerson(person)
    setForm(buildFormState(person))
    setFilterValue("")
  }, [])

  const handleReset = React.useCallback(() => {
    setEditingPerson(null)
    setForm(defaultFormState)
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitError(null)
      setSubmitSuccess(null)

      const trimmedFirst = form.firstName.trim()
      const trimmedLast = form.lastName.trim()

      if (!trimmedFirst || !trimmedLast) {
        setSubmitError("First name and last name are required.")
        return
      }

      const currentEditingId = editingPerson?.id ?? null
      const payload: Record<string, string> = {
        firstname: trimmedFirst,
        lastname: trimmedLast,
      }

      const slackValue = form.slackId.trim()
      if (slackValue.length > 0 || currentEditingId !== null) {
        payload.slack_id = slackValue
      }

      setIsSubmitting(true)
      try {
        const response = await fetch(
          currentEditingId !== null
            ? `${API_BASE_URL}/persons/${currentEditingId}`
            : `${API_BASE_URL}/persons`,
          {
            method: currentEditingId !== null ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        )

        if (!response.ok) {
          let message = `Failed to ${
            currentEditingId !== null ? "update" : "create"
          } person (HTTP ${response.status})`
          try {
            const errorJson = await response.json()
            const errorMessage =
              errorJson?.message ??
              errorJson?.error ??
              errorJson?.detail ??
              errorJson?.errors?.join?.(", ")
            if (typeof errorMessage === "string" && errorMessage.trim().length) {
              message = errorMessage
            }
          } catch {
            // ignore parse errors
          }
          throw new Error(message)
        }

        const createdJson = await response.json().catch(() => null)
        const createdPerson = decodePerson(createdJson)

        if (createdPerson) {
          setPersons((prev) =>
            sortPersons(
              currentEditingId !== null
                ? prev.map((person) =>
                    person.id === createdPerson.id ? createdPerson : person
                  )
                : [...prev, createdPerson]
            )
          )
        } else {
          fetchPersons()
        }

        setSubmitSuccess(
          createdPerson
            ? `${currentEditingId !== null ? "Updated" : "Added"} ${formatPersonName(createdPerson)}.`
            : currentEditingId !== null
              ? "Person updated successfully."
              : "Person created successfully."
        )

        setForm(defaultFormState)
        setEditingPerson(null)
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : `Failed to ${currentEditingId !== null ? "update" : "create"} person.`
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [editingPerson, fetchPersons, form]
  )

  const columns = React.useMemo<ColumnDef<PersonRow>[]>(() => {
    const actionHeader = "Actions"
    return [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.id}
          </span>
        ),
      },
      {
        accessorKey: "firstName",
        header: "First name",
        cell: ({ row }) => row.original.firstName ?? "—",
      },
      {
        accessorKey: "lastName",
        header: "Last name",
        cell: ({ row }) => row.original.lastName ?? "—",
      },
      {
        accessorKey: "slackId",
        header: "Slack ID",
        cell: ({ row }) => row.original.slackId ?? "—",
      },
      {
        id: "actions",
        header: actionHeader,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => startEdit(row.original)}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ]
  }, [startEdit])

  const highlightEditingRow = React.useCallback(
    (row: Row<PersonRow>) =>
      editingPerson && row.original.id === editingPerson.id
        ? "bg-muted/40"
        : "",
    [editingPerson]
  )

  const filteredPersons = React.useMemo(() => {
    if (!filterValue.trim()) {
      return persons
    }
    const query = filterValue.trim().toLowerCase()
    return persons.filter((person) => {
      const segments = [
        person.firstName ?? "",
        person.lastName ?? "",
        `${person.firstName ?? ""} ${person.lastName ?? ""}`,
        person.slackId ?? "",
        String(person.id),
      ]
      return segments.some((segment) => segment.toLowerCase().includes(query))
    })
  }, [filterValue, persons])

  const personCount = persons.length
  const filteredCount = filteredPersons.length

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage persons
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "You can update the selected person below."
              : "Add new people to the system. Only first and last name are required."}
          </p>
        </div>
        {isEditing ? (
          <Button type="button" variant="outline" onClick={handleReset}>
            Start a new person
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <span className="font-medium">
            Editing {formatPersonName(editingPerson)}
          </span>
          <span className="text-muted-foreground">
            Make changes in the form and click &ldquo;Save changes&rdquo;.
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
        <section className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {isEditing ? "Update person" : "Add person"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Adjust the details and save to update this person."
                : "Fill out the fields and press add to create a new person."}
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                First name
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={updateFormValue("firstName")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                  placeholder="Ada"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Last name
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={updateFormValue("lastName")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                  placeholder="Lovelace"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Slack ID
                <input
                  id="slackId"
                  name="slackId"
                  type="text"
                  value={form.slackId}
                  onChange={updateFormValue("slackId")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="@ada.l"
                />
              </label>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-sm text-emerald-600">{submitSuccess}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                {isEditing ? "Cancel" : "Reset"}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Add person"}
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Existing persons</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredCount} of {personCount} people.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="personFilter">
                  Filter persons
                </label>
                <input
                  id="personFilter"
                  type="search"
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  placeholder="Search by name, Slack ID, or ID"
                  className="h-9 w-full min-w-[220px] rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                {filterValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterValue("")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchPersons}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>

          {loadError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {loading && !persons.length ? (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
              Loading persons…
            </div>
          ) : filteredPersons.length ? (
            <DataTable
              columns={columns}
              data={filteredPersons}
              getRowClassName={highlightEditingRow}
            />
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
              No people match your search. Try a different name or clear the
              filter to see everyone.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
