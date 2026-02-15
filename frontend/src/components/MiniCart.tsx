import { type ReactNode, useMemo } from "react"
import { Link } from "react-router"
import { Button } from "@/components/shadcn/button"
import DataTable from "@/components/DataTable/DataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { useCart } from "@/store/useCart"
import type { CartItem } from "@/types/cart"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet"

interface MiniCartProps {
  trigger: ReactNode
}

function MiniCart({ trigger }: MiniCartProps) {
  const cartItems = useCart(state => state.cartItems)

  const columns = useMemo<ColumnDef<CartItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "numSelected",
        header: () => <span className="float-right">Borrowing</span>,
        cell: ({ row }) => (
          <span className="float-right">{row.getValue("numSelected")}</span>
        ),
      },
    ],
    []
  )

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold mt-1.5">Cart</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          {cartItems.length ? (
            <DataTable data={cartItems} columns={columns} />
          ) : (
            <div className="flex justify-center">
              <p className="text-sm text-[#BBB]">
                Your cart is empty.
              </p>
            </div>
          )}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button asChild>
              <Link to="/shopping-cart">Go to cart</Link>
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default MiniCart
