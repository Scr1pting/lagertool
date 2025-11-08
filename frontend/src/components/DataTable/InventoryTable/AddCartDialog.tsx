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
import { ShoppingCartIcon } from "lucide-react"
import { Separator } from "@/components/shadcn/separator"
import { useDate } from "@/store/useDate"
import { format } from "date-fns"
import { Textarea } from "@/components/shadcn/textarea"
import { Field, FieldDescription } from "@/components/shadcn/field"
import { useLayoutEffect, useRef, useState, type FormEvent } from "react"
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
      description: `${item.name} - ${numSelected}`,
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
            <span className="font-medium">{item.name}</span>
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
        description: `${cartItem.name} - ${cartItem.numSelected}`,
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
        <DialogTitle>{item.name}</DialogTitle>
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
type DialogPage = "Main" | "CheckoutAddInfo" | "CheckoutSubmit"

function AddCartDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<DialogPage>("Main")

  const [numSelected, setNumSelected] = useState<number>(1);
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const animatedContainerRef = useRef<HTMLDivElement>(null)
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const previousHeightRef = useRef<number | null>(null)
  const pendingAnimationRef = useRef(false)
  const heightAnimationRef = useRef<Animation | null>(null)

  // Smoothly animate the dialog height only when the wizard page changes.
  const animateToPage = (nextPage: DialogPage) => {
    if (contentWrapperRef.current) {
      previousHeightRef.current = contentWrapperRef.current.offsetHeight
      pendingAnimationRef.current = true
    }
    setPage(nextPage)
  }

  const animateHeightChange = () => {
    if (!open) {
      pendingAnimationRef.current = false
      return
    }

    const container = animatedContainerRef.current
    const content = contentWrapperRef.current

    if (!container || !content) {
      pendingAnimationRef.current = false
      return
    }

    const startHeight = previousHeightRef.current
    const nextHeight = content.offsetHeight

    pendingAnimationRef.current = false
    previousHeightRef.current = nextHeight

    if (startHeight == null || startHeight === nextHeight) {
      container.style.height = "auto"
      return
    }

    heightAnimationRef.current?.cancel()

    container.style.height = `${startHeight}px`

    const animation = container.animate(
      [
        { height: `${startHeight}px` },
        { height: `${nextHeight}px` },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    )

    animation.onfinish = () => {
      container.style.height = "auto"
      heightAnimationRef.current = null
    }

    animation.oncancel = () => {
      container.style.height = "auto"
      heightAnimationRef.current = null
    }

    heightAnimationRef.current = animation
  }

  useLayoutEffect(() => {
    if (!open) {
      heightAnimationRef.current?.cancel()
      pendingAnimationRef.current = false
      previousHeightRef.current = null

      if (animatedContainerRef.current) {
        animatedContainerRef.current.style.height = "auto"
      }

      return
    }

    if (contentWrapperRef.current) {
      previousHeightRef.current = contentWrapperRef.current.offsetHeight
    }
  }, [open])

  const handleExitComplete = () => {
    if (!pendingAnimationRef.current) {
      return
    }

    requestAnimationFrame(animateHeightChange)
  }

  function renderPage() {
    switch (page) {
      case "Main":
        return (
          <Main
            item={item}
            numSelected={numSelected}
            setNumSelected={setNumSelected}
            onProceed={() => animateToPage("CheckoutAddInfo")}
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
            onBack={() => animateToPage("Main")}
            onProceed={() => animateToPage("CheckoutSubmit")}
          />
        )
      case "CheckoutSubmit":
        return (
          <CheckoutSubmit
            item={item}
            numSelected={numSelected}
            title={title}
            description={description}
            onBack={() => animateToPage("CheckoutAddInfo")}
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
          variant="outline"
          className="h-8 p-0"
        >
          Add to cart
          <ShoppingCartIcon />
        </Button>
      </DialogTrigger>
      <MotionDialogContent className="sm:max-w-[425px]">
        <div
          ref={animatedContainerRef}
          style={{ overflow: "hidden", width: "100%" }}
        >
          <div ref={contentWrapperRef} style={{ width: "100%" }}>
            <AnimatePresence mode="wait" initial={false} onExitComplete={handleExitComplete}>
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4 p-1"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </MotionDialogContent>
    </Dialog>
  )
}

export default AddCartDialog;
