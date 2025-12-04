import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"


interface StandardSelect<T extends { id: string | number, name: string}> {
  id: string
  value: string | undefined
  options: T[]
  onValueChange: (arg0: string) => void
  disabled?: boolean
}

function StandardSelect<T extends { id: string | number, name: string}>({ id, value, options, onValueChange, disabled = false }: StandardSelect<T>) {
  return(
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select building" />
      </SelectTrigger>
      <SelectContent>
        {Array.isArray(options) && options.map((option) => (
          <SelectItem key={option.id} value={option.id.toString()}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default StandardSelect;
