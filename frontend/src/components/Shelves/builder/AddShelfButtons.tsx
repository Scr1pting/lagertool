import { useLocation, useNavigate } from 'react-router'

import { Button } from "@/components/shadcn/button"
import { type ShelfColumn } from '../../../types/shelf'
import { ArrowRight, X } from 'lucide-react'
import { Dialog } from '@/components/shadcn/dialog'
import { DialogTrigger } from '@radix-ui/react-dialog'
import AddShelfForm from './AddShelfForm'


type FromLocation = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type LocationState = {
  from?: FromLocation;
};

// Goes to the last page or the inventory.
// Enables using the browser back btn to return to ShelfBuilder.
export function ExitShelfBuilderButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const makePath = (from: FromLocation) => `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`

  const goBack = () => {
    const fromLocation = (location.state as LocationState | null)?.from
    if (fromLocation) {
      navigate(makePath(fromLocation), {
        replace: false,
        state: fromLocation.state,
      })
      return
    }
    navigate("/manage-inventory", { replace: false })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="-ml-1.5 rounded-full text-[#a3a3a3] hover:text-[#fafafa]"
      onClick={goBack}
      aria-label="Exit shelf builder"
      title="Exit"
    >
      <X />
    </Button>
  )
}

export function NextShelfBuilderButton({ columns }: { columns: ShelfColumn[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-10 w-full rounded-full">
          Next
          <ArrowRight />
        </Button>
      </DialogTrigger>

      <AddShelfForm columns={columns} />
    </Dialog>
  )
}
