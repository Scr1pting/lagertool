import { type ReactNode, useMemo } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/shadcn/button"
import DataTable from "@/components/DataTable/DataTable"
import type { ColumnDef } from "@tanstack/react-table"
import { useCart } from "@/store/useCart"
import type { CartItem } from "@/types/cart"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet"

interface MiniCartProps {
  trigger: ReactNode
}

function MiniCart({ trigger }: MiniCartProps) {
  const cartItems = useCart((state) => state.cartItems)

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
          <SheetTitle className="text-lg font-semibold">Cart</SheetTitle>
          <SheetDescription>
            Review your selected items or continue to the cart for checkout.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-4">
          {cartItems.length ? (
            <div className="max-h-64 overflow-y-auto text-sm">
              <DataTable data={cartItems} columns={columns} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your cart is empty. Add items from the inventory to see them here.
            </p>
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

export default MiniCart;
