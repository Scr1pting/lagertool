import { Maximize2, Minus, Plus } from 'lucide-react'

import { MAX_ZOOM, MIN_ZOOM } from '../util/shelfUnits'

type ZoomControlsProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  disabled?: boolean;
};

// Frosted, map-style floating controls
const group = 'flex w-8 flex-col items-stretch overflow-hidden rounded-[10px] border border-white/10 bg-[#1c1c1c]/75 shadow-lg shadow-black/40 backdrop-blur-xl'
const segment = 'flex h-8 items-center justify-center text-[#d4d4d4] transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4'

function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit, disabled }: ZoomControlsProps) {
  return (
    <div className="absolute top-5 right-5 z-10 flex flex-col gap-2">
      <div className={group}>
        <button
          type="button"
          className={segment}
          onClick={onZoomIn}
          disabled={disabled || zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          title={`Zoom in (${Math.round(zoom * 100)}%)`}
        >
          <Plus />
        </button>
        <div className="mx-1.5 h-px bg-white/15" />
        <button
          type="button"
          className={segment}
          onClick={onZoomOut}
          disabled={disabled || zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          title={`Zoom out (${Math.round(zoom * 100)}%)`}
        >
          <Minus />
        </button>
      </div>

      <div className={group}>
        <button
          type="button"
          className={segment}
          onClick={onFit}
          disabled={disabled}
          aria-label="Fit shelf to screen"
          title="Fit to screen"
        >
          <Maximize2 className="size-3.5!" />
        </button>
      </div>
    </div>
  )
}

export default ZoomControls
