import { Redo2, Undo2 } from 'lucide-react'

import { Button } from '@/components/shadcn/button'

type HistoryControlsProps = {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const buttonClass = 'rounded-full text-[#a3a3a3] hover:text-[#fafafa]'

function HistoryControls({ onUndo, onRedo, canUndo, canRedo }: HistoryControlsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className={buttonClass}
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘ Z)"
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={buttonClass}
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⌘ ⇧ Z)"
      >
        <Redo2 />
      </Button>
    </>
  )
}

export default HistoryControls
