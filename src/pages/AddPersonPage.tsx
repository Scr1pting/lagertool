"use client"

import * as React from "react"
import { type ColumnDef, type Row } from "@tanstack/react-table"

import { Link } from "react-router-dom"

import DataTable from "@/components/DataTable"
import PersonLink from "@/components/PersonLink"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"

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
        id: "actions",
        header: actionHeader,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => startEdit(row.original)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
            >
              <Link to={`/persons/${row.original.id}`}>View history</Link>
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
  const editingPersonName = editingPerson
    ? formatPersonName(editingPerson)
    : "selected person"

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Manage persons
          </h1>
          <p className="text-base text-muted-foreground">
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
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm shadow-sm">
          <div className="flex h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
          <div className="flex-1">
            <span className="font-semibold text-primary">
              Editing {editingPersonName}
            </span>
            <span className="ml-2 text-muted-foreground">
              Make changes in the form and click &ldquo;Save changes&rdquo;.
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>{isEditing ? "Update person" : "Add person"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Adjust the details and save to update this person."
                : "Fill out the fields and press add to create a new person."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <Field>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={updateFormValue("firstName")}
                  required
                  placeholder="Ada"
                />
              </Field>
              <Field>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={updateFormValue("lastName")}
                  required
                  placeholder="Lovelace"
                />
              </Field>

              {submitError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                  {submitSuccess}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
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
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Existing persons</CardTitle>
                <CardDescription>
                  Showing {filteredCount} of {personCount} people.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <Label className="sr-only" htmlFor="personFilter">
                    Filter persons
                  </Label>
                  <Input
                    id="personFilter"
                    type="search"
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                    placeholder="Search by name"
                    className="w-full min-w-[220px]"
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
          </CardHeader>

          <CardContent className="space-y-4">
            {loadError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            )}

            {loading && !persons.length ? (
              <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                Loading persons…
              </div>
            ) : filteredPersons.length ? (
              <DataTable
                columns={columns}
                data={filteredPersons}
                getRowClassName={highlightEditingRow}
              />
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                No people match your search. Try a different name or clear the
                filter to see everyone.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
