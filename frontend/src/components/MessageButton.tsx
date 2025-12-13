import { useState } from "react"
import { Button } from "./shadcn/button"
import { Popover, PopoverContent, PopoverTrigger } from "./shadcn/popover"
import { Mail } from 'lucide-react'

interface MessageButtonProps {
  label?: string;
  disabled?: boolean;
}

function MessageButton({ label = "Message", disabled = false }: MessageButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={nextOpen => setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          aria-label={label}
          className="h-9 w-9 p-0 rounded-full"
        >
          <Mail className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-2">
          <div className="text-sm font-medium">Message from admin</div>
          <p className="text-sm text-muted-foreground">
            This is a placeholder for an admin message or instructions about the approved loan.
          </p>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MessageButton
