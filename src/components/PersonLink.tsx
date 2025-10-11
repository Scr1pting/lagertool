"use client"

import * as React from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  personDisplayName,
  type NormalizedPerson,
} from "@/lib/person"

type PersonLinkProps = {
  personId: number
  person?: NormalizedPerson | null
  children?: React.ReactNode
  className?: string
}

export default function PersonLink({
  personId,
  person,
  children,
  className,
}: PersonLinkProps) {
  const content = children ?? personDisplayName(person ?? undefined)
  return (
    <Link
      to={`/persons/${personId}`}
      className={cn(
        "text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {content}
    </Link>
  )
}
