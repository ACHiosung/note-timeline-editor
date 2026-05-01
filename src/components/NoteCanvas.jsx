import React, { useRef, useCallback } from 'react'

// Colors keyed by note type
const TYPE_COLOR = {
  0: '#60A5FA',  // Tap  – blue
  1: '#34D399',  // Hold – green
  2: '#FBBF24',  // Slide – amber
}
const DEFAULT_COLOR = '#9CA3AF'

const TYPE_LABEL = { 0: 'Tap', 1: 'Hold', 2: 'Slide' }

function noteColor(type) {
  return TYPE_COLOR[type] ?? DEFAULT_COLOR
}

export default function NoteCanvas({ bar, worldBounds, onNoteMove }) {
  const svgRef = useRef(null)

  // Convert a mouse event to world coordinates using the SVG transformation matrix.
  const toWorldCoords = useCallback((mouseX, mouseY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = mouseX
    pt.y = mouseY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
    // SVG viewBox negates y (because game y-axis points up, SVG points down).
    return {
      x: +svgPt.x.toFixed(4),
      y: +(-svgPt.y).toFixed(4),
    }
  }, [])

  const startDrag = useCallback(
    (e, noteId, posField) => {
      e.preventDefault()
      e.stopPropagation()

      const onMouseMove = (me) => {
        const { x, y } = toWorldCoords(me.clientX, me.clientY)
        onNoteMove(noteId, posField, x, y)
      }
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [toWorldCoords, onNoteMove]
  )

  if (!bar) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500 text-sm select-none">
        하단 타임라인에서 바를 클릭하세요
      </div>
    )
  }

  const { xMin, xMax, yMin, yMax, xRange, yRange } = worldBounds

  // SVG viewBox maps directly to world coordinates, with y-axis flipped.
  // viewBox origin is (xMin, -yMax): the top-left in SVG = top-left in world
  // (remembering world y increases upward).
  const viewBox = `${xMin} ${-yMax} ${xRange} ${yRange}`

  // Size visual elements relative to the world coordinate range.
  const r = xRange * 0.025        // circle radius
  const rEnd = r * 0.65           // end-position handle radius
  const strokeW = r * 0.15        // circle border width
  const lineW = r * 0.35          // connector line width
  const fontSize = xRange * 0.022 // label font size

  return (
    <div
      className="flex-1 relative overflow-hidden bg-gray-900"
      style={{
        backgroundImage:
          'radial-gradient(circle, #374151 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Bar info overlay */}
      <div className="absolute top-3 left-4 text-white/50 text-sm font-semibold pointer-events-none select-none z-10">
        {bar.label}&nbsp;
        <span className="text-xs font-normal text-white/30">
          {bar.startTime.toFixed(1)}s – {bar.endTime.toFixed(1)}s
          &nbsp;·&nbsp;{bar.notes.length}노트
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-4 flex gap-2 pointer-events-none select-none z-10">
        {Object.entries(TYPE_LABEL).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1 text-[10px] text-gray-400">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: TYPE_COLOR[type] }}
            />
            {label}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0"
      >
        {/* Axis lines */}
        <line
          x1={xMin} y1="0" x2={xMax} y2="0"
          stroke="#4B5563" strokeWidth={xRange * 0.002}
          strokeDasharray={`${xRange * 0.01} ${xRange * 0.008}`}
        />
        <line
          x1="0" y1={-yMax} x2="0" y2={-yMin}
          stroke="#4B5563" strokeWidth={xRange * 0.002}
          strokeDasharray={`${yRange * 0.02} ${yRange * 0.016}`}
        />

        {/* Connector lines for slide notes – drawn before circles so circles sit on top */}
        {bar.notes.map((note) => {
          if (note.type !== 2 || note.duration <= 0) return null
          return (
            <line
              key={`line-${note.id}`}
              x1={note.position.x}
              y1={-note.position.y}
              x2={note.endPosition.x}
              y2={-note.endPosition.y}
              stroke={noteColor(note.type)}
              strokeWidth={lineW}
              strokeOpacity={0.55}
              strokeLinecap="round"
            />
          )
        })}

        {/* Note circles + labels */}
        {bar.notes.map((note) => {
          const color = noteColor(note.type)
          const cx = note.position.x
          const cy = -note.position.y

          return (
            <g key={note.id}>
              {/* Hold ring (type 1) */}
              {note.type === 1 && note.duration > 0 && (
                <circle
                  cx={cx} cy={cy} r={r * 1.45}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeW * 0.8}
                  strokeOpacity={0.45}
                />
              )}

              {/* Main position circle */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={color} fillOpacity={0.85}
                stroke="white" strokeWidth={strokeW} strokeOpacity={0.4}
                cursor="grab"
                onMouseDown={(e) => startDrag(e, note.id, 'position')}
              />

              {/* End-position handle for slide notes */}
              {note.type === 2 && note.duration > 0 && (
                <circle
                  cx={note.endPosition.x}
                  cy={-note.endPosition.y}
                  r={rEnd}
                  fill={color} fillOpacity={0.5}
                  stroke="white" strokeWidth={strokeW} strokeOpacity={0.3}
                  cursor="grab"
                  onMouseDown={(e) => startDrag(e, note.id, 'endPosition')}
                />
              )}

              {/* Type + time label above the circle */}
              <text
                x={cx} y={cy - r * 1.5}
                textAnchor="middle"
                fontSize={fontSize}
                fill="white" fillOpacity={0.6}
                pointerEvents="none"
              >
                {TYPE_LABEL[note.type] ?? `t${note.type}`} {note.time.toFixed(2)}s
              </text>

              {/* World-coordinate position below the circle */}
              <text
                x={cx} y={cy + r * 2.2}
                textAnchor="middle"
                fontSize={fontSize * 0.78}
                fill="white" fillOpacity={0.38}
                pointerEvents="none"
              >
                ({note.position.x}, {note.position.y})
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
