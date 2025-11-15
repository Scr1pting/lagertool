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
import { useState, type Dispatch, type SetStateAction } from "react"


interface ComboboxProps<T, D> {
  options: D[] | null
  selectedId: T | null
  setSelectedId: Dispatch<SetStateAction<T | null>>
  placeholder: string
}

export function Combobox<T extends string | number, D extends { id: T, name: string }>(
  { options, selectedId, setSelectedId, placeholder }: ComboboxProps<T, D>
) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={options == null || options.length == 0}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {selectedId && options
            ? options.find((option) => option.id === selectedId)?.name
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search..."
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              {options && options
                .map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={(currentValue) => {
                      setSelectedId(
                        currentValue === options.find(option => option.id === selectedId)?.name
                          ? null
                          : options?.find(option => option.name === currentValue)?.id ?? null)
                      setOpen(false)
                    }}
                  >
                    {option.name}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedId === option.id ? "opacity-100" : "opacity-0"
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
