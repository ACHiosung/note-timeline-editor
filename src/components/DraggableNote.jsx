import React, { useRef, useCallback } from 'react'

const COLORS = [
  'bg-blue-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-purple-400',
  'bg-cyan-400',
  'bg-orange-400',
  'bg-pink-400',
]

export default function DraggableNote({ note, colorIndex, canvasRef, onMove }) {
  const dragState = useRef(null)
  const colorClass = COLORS[colorIndex % COLORS.length]

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      dragState.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPosX: note.pos.x,
        startPosY: note.pos.y,
        rectLeft: rect.left,
        rectTop: rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
      }

      const onMouseMove = (moveEvent) => {
        if (!dragState.current) return
        const dx = moveEvent.clientX - dragState.current.startMouseX
        const dy = moveEvent.clientY - dragState.current.startMouseY
        const newX = Math.max(
          0,
          Math.min(
            dragState.current.rectWidth - 1,
            dragState.current.startPosX + dx
          )
        )
        const newY = Math.max(
          0,
          Math.min(
            dragState.current.rectHeight - 1,
            dragState.current.startPosY + dy
          )
        )
        onMove(note.id, Math.round(newX), Math.round(newY))
      }

      const onMouseUp = () => {
        dragState.current = null
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [note, canvasRef, onMove]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ left: note.pos.x, top: note.pos.y }}
      className={`absolute select-none cursor-grab active:cursor-grabbing
        ${colorClass} text-white text-xs font-semibold
        px-3 py-1.5 rounded-lg shadow-md
        border-2 border-white/40
        transform -translate-x-1/2 -translate-y-1/2
        hover:brightness-110 transition-[filter]`}
      title={`pos: (${note.pos.x}, ${note.pos.y})`}
    >
      {note.text}
      <span className="ml-1.5 text-white/60 text-[10px] font-normal">
        ({note.pos.x}, {note.pos.y})
      </span>
    </div>
  )
}
