import React, { useRef } from 'react'
import DraggableNote from './DraggableNote'

export default function NoteCanvas({ bar, onNoteMove }) {
  const canvasRef = useRef(null)

  if (!bar) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500 text-sm select-none">
        하단 타임라인에서 바를 클릭하세요
      </div>
    )
  }

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      {/* Bar label */}
      <div className="absolute top-3 left-4 text-white/50 text-sm font-semibold pointer-events-none select-none">
        {bar.label} &nbsp;
        <span className="text-xs font-normal text-white/30">
          {bar.startTime}s – {bar.endTime}s &nbsp;·&nbsp; 노트 {bar.notes.length}개
        </span>
      </div>

      {bar.notes.map((note, idx) => (
        <DraggableNote
          key={note.id}
          note={note}
          colorIndex={idx}
          canvasRef={canvasRef}
          onMove={onNoteMove}
        />
      ))}
    </div>
  )
}
