import React from 'react'

const BAR_COLORS = [
  { bg: 'bg-blue-600',   hover: 'hover:bg-blue-500',   selected: 'bg-blue-400',   border: 'border-blue-400' },
  { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-500', selected: 'bg-emerald-400', border: 'border-emerald-400' },
  { bg: 'bg-amber-600',  hover: 'hover:bg-amber-500',  selected: 'bg-amber-400',  border: 'border-amber-400' },
  { bg: 'bg-rose-600',   hover: 'hover:bg-rose-500',   selected: 'bg-rose-400',   border: 'border-rose-400' },
  { bg: 'bg-purple-600', hover: 'hover:bg-purple-500', selected: 'bg-purple-400', border: 'border-purple-400' },
  { bg: 'bg-cyan-600',   hover: 'hover:bg-cyan-500',   selected: 'bg-cyan-400',   border: 'border-cyan-400' },
  { bg: 'bg-orange-600', hover: 'hover:bg-orange-500', selected: 'bg-orange-400', border: 'border-orange-400' },
  { bg: 'bg-pink-600',   hover: 'hover:bg-pink-500',   selected: 'bg-pink-400',   border: 'border-pink-400' },
]

export default function Timeline({ bars, selectedBarId, onSelectBar }) {
  if (!bars || bars.length === 0) return null

  const minTime = Math.min(...bars.map((b) => b.startTime))
  const maxTime = Math.max(...bars.map((b) => b.endTime))
  const totalDuration = maxTime - minTime || 1

  return (
    <div className="bg-gray-950 border-t border-gray-700 px-2 py-2">
      {/* Time ruler */}
      <div className="relative h-4 mb-1 mx-0.5 select-none">
        {bars.map((bar) => {
          const leftPct = ((bar.startTime - minTime) / totalDuration) * 100
          const widthPct = ((bar.endTime - bar.startTime) / totalDuration) * 100
          return (
            <span
              key={bar.id}
              className="absolute text-gray-500 text-[10px]"
              style={{ left: `${leftPct}%` }}
            >
              {bar.startTime}s
            </span>
          )
        })}
        <span
          className="absolute text-gray-500 text-[10px]"
          style={{ left: '100%', transform: 'translateX(-100%)' }}
        >
          {maxTime}s
        </span>
      </div>

      {/* Bars row */}
      <div className="relative flex h-12 mx-0.5 gap-px">
        {bars.map((bar, idx) => {
          const color = BAR_COLORS[idx % BAR_COLORS.length]
          const widthPct = ((bar.endTime - bar.startTime) / totalDuration) * 100
          const isSelected = bar.id === selectedBarId

          return (
            <button
              key={bar.id}
              onClick={() => onSelectBar(bar.id)}
              style={{ width: `${widthPct}%` }}
              className={`
                relative flex flex-col items-start justify-center px-2 rounded
                text-white text-xs font-semibold overflow-hidden
                border-2 transition-all duration-150 cursor-pointer
                ${isSelected
                  ? `${color.selected} ${color.border} shadow-lg scale-y-105`
                  : `${color.bg} border-transparent ${color.hover}`}
              `}
              title={`${bar.label} (${bar.startTime}s – ${bar.endTime}s)`}
            >
              <span className="truncate w-full">{bar.label}</span>
              <span className="text-white/60 text-[10px] font-normal">
                {bar.notes.length}노트
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
