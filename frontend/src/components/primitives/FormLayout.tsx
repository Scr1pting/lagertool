import { Field, FieldGroup, FieldLabel } from "../shadcn/field";
import type { FormElement } from "./types/FormElement"


interface FormProps {
  elements: FormElement[]
}

function FormLayout({ elements }: FormProps) {
  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      {elements.map((element) =>
        <Field key={element.id} className={`grid gap-2 ${element.size === 'full' ? 'sm:col-span-2' : ''}`}>
          <FieldLabel htmlFor={element.id}>{element.label}</FieldLabel>
          {element.input}
        </Field>
      )}
    </FieldGroup>
  )
}

export default FormLayout;
