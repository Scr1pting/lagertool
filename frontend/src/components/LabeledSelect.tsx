import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./shadcn/select"


interface LabeledSelect<T extends { id: string, name: string}> {
  id: string
  value: string | undefined
  options: T[]
  onValueChange: (arg0: string) => void
  disabled?: boolean
}

function LabeledSelect<T extends { id: string, name: string}>({ id, value, options, onValueChange, disabled = false }: LabeledSelect<T>) {
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
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LabeledSelect;
