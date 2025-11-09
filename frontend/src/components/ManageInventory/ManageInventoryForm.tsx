import { Button } from "../shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../shadcn/card"
import { Label } from "../shadcn/label"
import type { ManageInventoryElement } from "./types/ManageInventoryElement"



interface ManageInventoryCardProps1 {
  title: string
  elements: ManageInventoryElement[]
}

function ManageInventoryForm({ title, elements }: ManageInventoryCardProps1) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{title}</CardTitle>
      </CardHeader>

      <CardContent className={`grid gap-4 sm:grid-cols-2`}>
        {elements.map((element) =>
          <div key={element.id} className={`grid gap-2 ${element.size === 'full' ? 'sm:col-span-2' : ''}`}>
            <Label htmlFor={element.id}>{element.label}</Label>
            {element.input}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button">Save</Button>
      </CardFooter>
    </Card>
  )
}

export default ManageInventoryForm
