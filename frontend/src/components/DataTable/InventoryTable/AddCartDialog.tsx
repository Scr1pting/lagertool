import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/store/useCart"
import type { CartItem } from "@/types/cart"
import type { InventoryItem } from "@/types/inventory"
import { PlusIcon } from "lucide-react"
import { useState, type FormEvent } from "react"



function AddCartDialog({ item }: { item: InventoryItem }) {
  const add = useCart((state) => state.add);
  const [numSelected, setNumSelected] = useState<number>(1);
  const exceedsAvailable = !Number.isNaN(numSelected) && numSelected > item.available;
  const isInvalidQuantity = Number.isNaN(numSelected) || numSelected < 1 || exceedsAvailable;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isInvalidQuantity) {
      const cartItem: CartItem = { ...item, numSelected: numSelected };
      add(cartItem);
    }
  };

  return (
    <Dialog>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Add to cart</span>
            <PlusIcon />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{item.item_name}</DialogTitle>
            <DialogDescription>
              {item.available} Available.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="num-selected">Amount</Label>
              <Input
                id="num-selected"
                name="numSelected"
                type="number"
                min={1}
                max={item.available}
                aria-invalid={exceedsAvailable}
                value={numSelected}
                onChange={(event) => {
                  setNumSelected(Number.parseInt(event.target.value, 10));
                }}
              />
              {exceedsAvailable && (
                <p className="text-sm font-medium text-destructive" role="alert">
                  Only {item.available} available.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={isInvalidQuantity} type="submit">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

export default AddCartDialog;
