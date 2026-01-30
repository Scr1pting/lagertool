import type { InventoryItem } from "@/types/inventory"
import InstantCheckoutVerify from "./pages/InstantCheckoutVerify"
import AnimatedDialog from "../primitives/AnimatedDialog"
import { useState, type ReactNode } from "react"
import AmountForm from "./pages/AmountForm"
import InstantCheckoutForm from "./pages/InstantCheckoutForm"


function AddCartDialog({ item, children }: { item: InventoryItem, children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const [numSelected, setNumSelected] = useState<number>(1)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const resetValues = () => {
    
  }

  const pages = [
    <AmountForm
      item={item}
      numSelected={numSelected}
      setNumSelected={setNumSelected}
      onProceed={() => setCurrentPage(currentPage + 1)}
      resetValues={resetValues}
    />,
    <InstantCheckoutForm
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      onBack={() => setCurrentPage(currentPage - 1)}
      onProceed={() => setCurrentPage(currentPage + 1)}
    />,
    <InstantCheckoutVerify
      item={item}
      numSelected={numSelected}
      title={title}
      description={description}
      onBack={() => setCurrentPage(currentPage - 1)}
      resetValues={resetValues}
    />
  ]

  return (
    <AnimatedDialog
      pages={pages}
      currentPage={currentPage}
      open={open}
      onOpenChange={newOpen => setOpen(newOpen)}>
      {children}
    </AnimatedDialog>
  )
}

export default AddCartDialog
