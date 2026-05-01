import React, { useState, useCallback, useMemo, useEffect } from 'react'
import Timeline from './components/Timeline'
import NoteCanvas from './components/NoteCanvas'

// Group flat notes array into time-interval bars.
// Notes with type === -1 are end-markers and are excluded.
function groupIntoBars(notes, intervalSeconds) {
  const valid = notes.filter((n) => n.type !== -1)
  if (!valid.length) return []

  const minT =
    Math.floor(Math.min(...valid.map((n) => n.time)) / intervalSeconds) *
    intervalSeconds
  const maxT = Math.max(...valid.map((n) => n.time + (n.duration || 0)))

  const bars = []
  for (let t = minT; t <= maxT; t = +(t + intervalSeconds).toFixed(6)) {
    const barNotes = valid.filter(
      (n) => n.time >= t && n.time < t + intervalSeconds
    )
    if (barNotes.length > 0) {
      bars.push({
        id: `bar-${t.toFixed(3)}`,
        label: `${t.toFixed(1)}s`,
        startTime: t,
        endTime: +(t + intervalSeconds).toFixed(6),
        notes: barNotes,
      })
    }
  }
  return bars
}

// Compute the world-coordinate bounding box from all notes with 1-unit padding.
function computeWorldBounds(notes) {
  const valid = notes.filter((n) => n.type !== -1)
  if (!valid.length) return { xMin: -6, xMax: 6, yMin: -3, yMax: 3, xRange: 12, yRange: 6 }

  const xs = valid.flatMap((n) => [
    n.position.x,
    ...(n.duration > 0 ? [n.endPosition.x] : []),
  ])
  const ys = valid.flatMap((n) => [
    n.position.y,
    ...(n.duration > 0 ? [n.endPosition.y] : []),
  ])
  const pad = 1
  const xMin = Math.min(...xs) - pad
  const xMax = Math.max(...xs) + pad
  const yMin = Math.min(...ys) - pad
  const yMax = Math.max(...ys) + pad
  return { xMin, xMax, yMin, yMax, xRange: xMax - xMin, yRange: yMax - yMin }
}

// Attach a unique id to each note using its original array index.
function attachIds(notes) {
  return notes.map((n, i) => ({ ...n, id: `n${i}` }))
}

export default function App() {
  const [data, setData] = useState(null)       // { notes: [...with id] }
  const [selectedBarId, setSelectedBarId] = useState(null)
  const [fileName, setFileName] = useState('')
  const [barInterval, setBarInterval] = useState(4)

  const loadNotes = useCallback((parsed, name) => {
    if (!Array.isArray(parsed.notes)) {
      alert('유효하지 않은 JSON 형식입니다. { "notes": [...] } 구조가 필요합니다.')
      return
    }
    setData({ notes: attachIds(parsed.notes) })
    setFileName(name)
    setSelectedBarId(null)
  }, [])

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          loadNotes(JSON.parse(event.target.result), file.name)
        } catch {
          alert('JSON 파일을 파싱하는 데 실패했습니다.')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [loadNotes]
  )

  const handleLoadSample = useCallback(async () => {
    try {
      const res = await fetch('/sample.json')
      loadNotes(await res.json(), 'sample.json')
    } catch {
      alert('샘플 파일을 불러오는 데 실패했습니다.')
    }
  }, [loadNotes])

  // Update a note's position or endPosition after dragging.
  // posField is either 'position' or 'endPosition'.
  const handleNoteMove = useCallback((noteId, posField, x, y) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        notes: prev.notes.map((note) =>
          note.id === noteId ? { ...note, [posField]: { x, y } } : note
        ),
      }
    })
  }, [])

  // Save: strip internal ids before writing back to JSON.
  const handleSave = useCallback(() => {
    if (!data) return
    const output = { notes: data.notes.map(({ id, ...rest }) => rest) }
    const json = JSON.stringify(output, null, 4)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'notes.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [data, fileName])

  const bars = useMemo(
    () => (data ? groupIntoBars(data.notes, barInterval) : []),
    [data, barInterval]
  )

  const worldBounds = useMemo(
    () =>
      data
        ? computeWorldBounds(data.notes)
        : { xMin: -6, xMax: 6, yMin: -3, yMax: 3, xRange: 12, yRange: 6 },
    [data]
  )

  // Auto-select the first bar when the bar list changes and the current
  // selection is no longer valid.
  useEffect(() => {
    setSelectedBarId((prev) => {
      if (bars.find((b) => b.id === prev)) return prev
      return bars[0]?.id ?? null
    })
  }, [bars])

  const selectedBar = bars.find((b) => b.id === selectedBarId) ?? null

  return (
    <div className="flex flex-col w-full h-full bg-gray-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap">
        <span className="text-white font-bold text-sm tracking-wide mr-2">
          🎵 Note Timeline Editor
        </span>

        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            📂 JSON 불러오기
          </span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold transition-colors"
        >
          샘플 불러오기
        </button>

        <label className="flex items-center gap-1.5 text-xs text-gray-300">
          바 간격(초):
          <input
            type="number"
            min="0.5"
            max="60"
            step="0.5"
            value={barInterval}
            onChange={(e) =>
              setBarInterval(Math.max(0.5, Number(e.target.value)))
            }
            className="w-16 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-gray-600 focus:outline-none focus:border-blue-400"
          />
        </label>

        {data && (
          <>
            <span className="text-gray-400 text-xs truncate max-w-[160px]">
              {fileName}
            </span>
            <span className="text-gray-500 text-xs">
              {data.notes.filter((n) => n.type !== -1).length}노트
            </span>
            <button
              onClick={handleSave}
              className="ml-auto px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
            >
              💾 JSON 저장
            </button>
          </>
        )}
      </div>

      {/* Note canvas */}
      <NoteCanvas
        bar={selectedBar}
        worldBounds={worldBounds}
        onNoteMove={handleNoteMove}
      />

      {/* Timeline */}
      {bars.length > 0 && (
        <Timeline
          bars={bars}
          selectedBarId={selectedBarId}
          onSelectBar={setSelectedBarId}
        />
      )}
    </div>
  )
}
