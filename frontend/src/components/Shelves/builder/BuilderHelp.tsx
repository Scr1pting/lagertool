import { CircleHelp } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

import { Button } from '@/components/shadcn/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shadcn/dialog'

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

const Key = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[#333] bg-[#161616] px-1 font-sans text-[11px] text-[#d4d4d4]">
    {children}
  </kbd>
)

const Keys = ({ keys }: { keys: string[] }) => (
  <span className="flex shrink-0 items-center gap-1">
    {keys.map((key, index) => <Key key={index}>{key}</Key>)}
  </span>
)

type Tip = { text: string; keys?: string[][] }

const SECTIONS: { title: string; tips: Tip[] }[] = [
  {
    title: 'Build',
    tips: [
      { text: 'Drop on a column to stack' },
      { text: 'Drop beside the shelf for a new column' },
      { text: 'Drag a selected piece to move them all' },
    ],
  },
  {
    title: 'Select',
    tips: [
      { text: 'Add or remove from selection', keys: [['⇧', 'Click']] },
      { text: 'Drag across empty canvas to select an area' },
      { text: 'Select all', keys: [[MOD, 'A']] },
    ],
  },
  {
    title: 'Remove',
    tips: [
      { text: 'Drag pieces back to the panel' },
      { text: 'Remove the selection', keys: [['⌫']] },
    ],
  },
  {
    title: 'Navigate',
    tips: [
      { text: 'Pan', keys: [['Scroll']] },
      { text: 'Zoom', keys: [[MOD, 'Scroll'], ['Pinch']] },
      { text: 'Zoom in / out', keys: [[MOD, '+'], [MOD, '−']] },
      { text: 'Reset to 100%', keys: [[MOD, '0']] },
    ],
  },
  {
    title: 'History',
    tips: [
      { text: 'Undo', keys: [[MOD, 'Z']] },
      { text: 'Redo', keys: [[MOD, '⇧', 'Z']] },
    ],
  },
]

type BuilderHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function BuilderHelp({ open, onOpenChange }: BuilderHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-[#737373] hover:text-[#fafafa]"
          aria-label="Tips and shortcuts"
          title="Tips and shortcuts (?)"
        >
          <CircleHelp />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="gap-0 overflow-hidden rounded-2xl border-[#262626] bg-[#0f0f0f] p-0 sm:max-w-2xl"
        // The builder's own "?" shortcut is ignored inside dialogs, so close from here
        onKeyDown={event => {
          if (event.key === '?') onOpenChange(false)
        }}
      >
        <DialogHeader className="border-b border-[#1f1f1f] px-7 pt-6 pb-5">
          <DialogTitle>Tips & shortcuts</DialogTitle>
          <DialogDescription>How to build, edit and navigate a shelf.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-10 gap-y-7 px-7 py-6 sm:grid-cols-2">
          {SECTIONS.map(section => (
            <section key={section.title} className="flex flex-col gap-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
                {section.title}
              </h4>
              {section.tips.map(tip => (
                <div key={tip.text} className="flex min-h-5 items-center justify-between gap-3 text-sm text-[#d4d4d4]">
                  <span>{tip.text}</span>
                  {tip.keys && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                      {tip.keys.map((combo, index) => (
                        <Fragment key={index}>
                          {index > 0 && <span>/</span>}
                          <Keys keys={combo} />
                        </Fragment>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-t border-[#1f1f1f] px-7 py-3.5 text-xs text-[#737373]">
          Press <Key>?</Key> anytime to open this
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BuilderHelp
