import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Button } from "../shadcn/button"
import type { CheckedOption } from "./types/CheckedOption"
import { useState } from "react"

interface CheckboxDropdownProps {
  title: string
  options: CheckedOption[]
  setOptions: React.Dispatch<React.SetStateAction<CheckedOption[]>>
}

function CheckboxDropdown(
  { title, options, setOptions }: CheckboxDropdownProps
) {
  const [showActivityBar, setShowActivityBar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{title}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuGroup>
          {options.map((option, index) =>
            <DropdownMenuCheckboxItem
              key={option.title}
              checked={option.checked}
              onCheckedChange={checked => {
                setOptions(prev => {
                  const next = [...prev]
                  next[index] = { ...next[index], checked }
                  return next
                })
              }}
            >
              {option.title}
            </DropdownMenuCheckboxItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CheckboxDropdown;
