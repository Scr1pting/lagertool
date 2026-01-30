import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/shadcn/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover"
import { useState } from "react"


interface ComboboxProps<T, K> {
  options: T[] | null | undefined
  selectedOption: T | undefined
  onOptionChange: (newOption: T | undefined) => void
  placeholder: string
  fieldKey?: K
  disabled?: boolean
}

function Combobox<
  T extends { id: number | string },
  K extends keyof T = "name" & keyof T
>(
  { options, selectedOption, onOptionChange, fieldKey = "name" as K, placeholder, disabled = false }: ComboboxProps<T, K>
) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={options == undefined || options.length == 0}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between truncate"
          disabled={disabled}
        >
          <span className="truncate min-w-0 text-left">
            {selectedOption && options ? String(selectedOption[fieldKey]) : placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput
            placeholder="Search..."
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              {options && options
                .map(option => (
                  <CommandItem
                    key={option.id}
                    value={String(option[fieldKey])}
                    onSelect={currentValue => {
                      onOptionChange(
                        selectedOption && currentValue === String(selectedOption[fieldKey])
                          ? undefined
                          : options.find(option => String(option[fieldKey]) === currentValue)
                      )
                      setOpen(false)
                    }}
                  >
                    {String(option[fieldKey])}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedOption === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Combobox
