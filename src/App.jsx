import React, { useState, useCallback } from 'react'
import Timeline from './components/Timeline'
import NoteCanvas from './components/NoteCanvas'

export default function App() {
  const [data, setData] = useState(null)
  const [selectedBarId, setSelectedBarId] = useState(null)
  const [fileName, setFileName] = useState('')

  // Load JSON from file input
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (!Array.isArray(parsed.bars)) {
          alert('유효하지 않은 JSON 형식입니다. { "bars": [...] } 구조가 필요합니다.')
          return
        }
        setData(parsed)
        setSelectedBarId(parsed.bars[0]?.id ?? null)
      } catch {
        alert('JSON 파일을 파싱하는 데 실패했습니다.')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-loaded
    e.target.value = ''
  }, [])

  // Load sample JSON bundled in public/
  const handleLoadSample = useCallback(async () => {
    try {
      const res = await fetch('/sample.json')
      const parsed = await res.json()
      setData(parsed)
      setFileName('sample.json')
      setSelectedBarId(parsed.bars[0]?.id ?? null)
    } catch {
      alert('샘플 파일을 불러오는 데 실패했습니다.')
    }
  }, [])

  // Update a note's position after dragging
  const handleNoteMove = useCallback((noteId, x, y) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        bars: prev.bars.map((bar) => ({
          ...bar,
          notes: bar.notes.map((note) =>
            note.id === noteId ? { ...note, pos: { x, y } } : note
          ),
        })),
      }
    })
  }, [])

  // Save current data as JSON file
  const handleSave = useCallback(() => {
    if (!data) return
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'notes.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [data, fileName])

  const selectedBar = data?.bars.find((b) => b.id === selectedBarId) ?? null

  return (
    <div className="flex flex-col w-full h-full bg-gray-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
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

        {data && (
          <>
            <span className="text-gray-400 text-xs truncate max-w-[160px]">{fileName}</span>
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
      <NoteCanvas bar={selectedBar} onNoteMove={handleNoteMove} />

      {/* Timeline */}
      {data && (
        <Timeline
          bars={data.bars}
          selectedBarId={selectedBarId}
          onSelectBar={setSelectedBarId}
        />
      )}
    </div>
  )
}
