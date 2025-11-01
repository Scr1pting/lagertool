import { Button } from "@/components/shadcn/button"
import {
  Dialog,
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
import { Separator } from "@/components/shadcn/separator"
import { useDate } from "@/store/useDate"
import { format } from "date-fns"
import { Textarea } from "@/components/shadcn/textarea"
import { Field, FieldDescription } from "@/components/shadcn/field"
import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"


// MARK: CheckoutSubmit
interface InstantCheckoutVerify {
  numSelected: number;
  item: InventoryItem;
  title: string;
  description: string;
  onBack: () => void;
  resetValues: () => void;
}

function CheckoutSubmit({ numSelected, item, title, description, onBack, resetValues }: InstantCheckoutVerify) {
  const selectedRange = useDate((state) => state.selectedRange);

  const formattedDateRange = () => {
    const today = new Date()

    if (!selectedRange?.from) {
      const todayLabel = format(today, "MMM d, yyyy")
      return `${todayLabel} - ${todayLabel}`
    }

    const startLabel = format(selectedRange.from, "MMM d, yyyy")
    const endDate = selectedRange.to ?? selectedRange.from
    const endLabel = format(endDate, "MMM d, yyyy")

    return `${startLabel} - ${endLabel}`
  }
  
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    toast("Added to cart", {
      description: `${item.item_name} - ${numSelected}`,
      action: {
        label: "Undo",
        onClick: () => console.log("Undo"),
      },
    });

    resetValues();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Direct Checkout</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-3 mt-2">
        <div className="my-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium">{title}</span>
          </div>

          <Separator />

          {description !== "" &&
            <>
              <div className="flex justify-between">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium">{description}</p>
              </div>
              <Separator />
            </>
          }

          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{item.item_name}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{numSelected}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formattedDateRange()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>

          <Button
            type="submit"
          >
            Submit Borrow Request
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}



// MARK: CheckoutAddInfo
interface InstantCheckoutDialogProps {
  title: string,
  setTitle: React.Dispatch<React.SetStateAction<string>>
  description: string
  setDescription: React.Dispatch<React.SetStateAction<string>>
  onBack: () => void
  onProceed: () => void
}

function CheckoutAddInfo({ title, setTitle, description, setDescription, onBack, onProceed }: InstantCheckoutDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title !== "") {
      onProceed();
    }
  };

  return(
    <>
      <DialogHeader>
        <DialogTitle>Direct Checkout</DialogTitle>
        <DialogDescription>
          Please add some info to your request.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <Field>
          <Label htmlFor="title">Title (Required)</Label>
          <Input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </Field>

        <Field>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
          />
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>

          <Button
            disabled={title === ""}
            type="submit"
          >
            Next
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}



// MARK: Main
interface MainProps {
  numSelected: number
  setNumSelected: React.Dispatch<React.SetStateAction<number>>
  item: InventoryItem
  resetValues: () => void
  onProceed: () => void
}

function Main({ numSelected, setNumSelected, item, resetValues, onProceed }: MainProps) {
  const add = useCart((state) => state.add);

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

      resetValues()
    }
  };

  return(
    <>
      <DialogHeader>
        <DialogTitle>{item.item_name}</DialogTitle>
        <DialogDescription>
          {item.available} Available.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <Field>
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
            <FieldDescription className="text-destructive" role="alert">
              Only {item.available} available.
            </FieldDescription>
          )}
        </Field>
        <DialogFooter>
          <Button
            disabled={isInvalidQuantity}
            type="button"
            onClick={onProceed}
            variant="outline"
          >
            Instant Checkout
          </Button>

          <Button
            disabled={isInvalidQuantity}
            type="submit"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}


// MARK: AddCartDialog
const MotionDialogContent = motion(DialogContent)

function AddCartDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<"Main" | "CheckoutAddInfo" | "CheckoutSubmit">("Main")

  const [numSelected, setNumSelected] = useState<number>(1);
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  function renderPage() {
    switch (page) {
      case "Main":
        return (
          <Main
            item={item}
            numSelected={numSelected}
            setNumSelected={setNumSelected}
            onProceed={() => setPage("CheckoutAddInfo")}
            resetValues={resetValues}
          />
        )
      case "CheckoutAddInfo":
        return (
          <CheckoutAddInfo
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            onBack={() => setPage("Main")}
            onProceed={() => setPage("CheckoutSubmit")}
          />
        )
      case "CheckoutSubmit":
        return (
          <CheckoutSubmit
            item={item}
            numSelected={numSelected}
            title={title}
            description={description}
            onBack={() => setPage("CheckoutAddInfo")}
            resetValues={resetValues}
          />
        )
    }
  }

  function resetValues() {
    setOpen(false)
    setPage("Main")
    setNumSelected(1)
    setTitle("")
    setDescription("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetValues()
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
      <MotionDialogContent
        className="sm:max-w-[425px] overflow-hidden"
        layout="size"
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </MotionDialogContent>
    </Dialog>
  )
}

export default AddCartDialog;
