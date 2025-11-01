import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { toast } from "sonner"
import { useCart } from "@/store/useCart"
import type { CartItem } from "@/types/cart"
import type { InventoryItem } from "@/types/inventory"
import { PlusIcon } from "lucide-react"
import { useState, type FormEvent } from "react"


function AddCartDialog({ item }: { item: InventoryItem }) {
  const add = useCart((state) => state.add);
  const [open, setOpen] = useState(false);
  const [numSelected, setNumSelected] = useState<number>(1);
  const exceedsAvailable = !Number.isNaN(numSelected) && numSelected > item.available;
  const isInvalidQuantity = Number.isNaN(numSelected) || numSelected < 1 || exceedsAvailable;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isInvalidQuantity) {
      const cartItem: CartItem = { ...item, numSelected: numSelected };
      add(cartItem);

      toast("Added to cart", {
        description: `${cartItem.item_name} - ${cartItem.numSelected}`,
        action: {
          label: "Undo",
          onClick: () => console.log("Undo"),
        },
      });

      setOpen(false);
      setNumSelected(1);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setNumSelected(1);
        }
      }}
    >
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
        <form onSubmit={handleSubmit} className="grid gap-4">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button
              disabled={isInvalidQuantity}
              type="submit"
            >
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddCartDialog;
