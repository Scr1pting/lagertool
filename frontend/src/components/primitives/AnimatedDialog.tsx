import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../shadcn/dialog";


const MotionDialogContent = motion.create(DialogContent)


interface AddCartDialogProps {
  pages: ReactNode[]
  currentPage: number
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

function AnimatedDialog({
  pages, currentPage, open, onOpenChange, children 
}: AddCartDialogProps) {
  const animatedContainerRef = useRef<HTMLDivElement>(null)
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const previousHeightRef = useRef<number | null>(null)
  const pendingAnimationRef = useRef(false)
  const heightAnimationRef = useRef<Animation | null>(null)

  // Smoothly animate the dialog height only when the wizard page changes.
  useLayoutEffect(() => {
    if (contentWrapperRef.current) {
      previousHeightRef.current = contentWrapperRef.current.offsetHeight
      pendingAnimationRef.current = true
    }
  }, [currentPage])

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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <MotionDialogContent className="sm:max-w-[425px]">
        <div
          ref={animatedContainerRef}
          style={{ overflow: "hidden", width: "100%" }}
        >
          <div ref={contentWrapperRef} style={{ width: "100%" }}>
            <AnimatePresence mode="wait" initial={false} onExitComplete={handleExitComplete}>
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4 p-1"
              >
                {pages[currentPage]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </MotionDialogContent>
    </Dialog>
  )
}

export default AnimatedDialog;
