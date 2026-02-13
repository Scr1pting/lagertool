import { type VariantProps } from "class-variance-authority"
import { badgeVariants } from "@/components/shadcn/badge"

export type BorrowStateUI = {
    label: string
    variant: VariantProps<typeof badgeVariants>["variant"]
}

export function getBorrowStateUI(state: string): BorrowStateUI {
    switch (state) {
        case "pending":
            return { label: "Pending", variant: "yellow" }
        case "approved":
            return { label: "Approved", variant: "blue" }
        case "returned":
            return { label: "Returned", variant: "emerald" }
        case "partial_overdue":
            return { label: "Partial overdue", variant: "amber" }
        case "overdue":
            return { label: "Overdue", variant: "red" }
        case "on_loan":
        default:
            return { label: "On loan", variant: "slate" }
    }
}
