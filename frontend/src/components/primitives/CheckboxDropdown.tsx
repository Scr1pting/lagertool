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
import { ChevronDown } from "lucide-react"

interface CheckboxDropdownProps {
  options: CheckedOption[]
  setOptions: React.Dispatch<React.SetStateAction<CheckedOption[]>>
  disabled?: boolean
  children: React.ReactNode
}

function CheckboxDropdown(
  { children, options, disabled, setOptions }: CheckboxDropdownProps
) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {children}
          <ChevronDown className="size-4 opacity-50" />
        </Button>
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

export default CheckboxDropdown
