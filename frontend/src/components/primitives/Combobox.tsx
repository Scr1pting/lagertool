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


interface ComboboxProps<D> {
  options: D[] | null | undefined
  selectedOption: D | undefined
  setSelectedOption: Dispatch<SetStateAction<D | undefined>>
  placeholder: string
  disabled?: boolean
}

function Combobox<D extends { id: string | number, name: string }>(
  { options, selectedOption, setSelectedOption, placeholder, disabled = false }: ComboboxProps<D>
) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={options == undefined || options.length == 0}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={disabled}
        >
          {selectedOption && options
            ? options.find((option) => option === selectedOption)?.name
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
                      setSelectedOption(
                          selectedOption && currentValue === selectedOption.name
                            ? undefined
                            : options.find(option => option.name == currentValue)
                        )
                      setOpen(false)
                    }}
                  >
                    {option.name}
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
