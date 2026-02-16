import { Button } from "../shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../shadcn/card"
import type { FormElement } from "../primitives/types/FormElement"
import FormLayout from "../primitives/FormLayout"


interface ManageInventoryCardProps {
  title: string
  elements: FormElement[]
}

function ManageInventoryCard({ title, elements }: ManageInventoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <FormLayout elements={elements} />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button">Save</Button>
      </CardFooter>
    </Card>
  )
}

export default ManageInventoryCard
