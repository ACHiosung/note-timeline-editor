import React, { useEffect, useRef } from 'react'

/**
 * BmsEditor
 * 레퍼런스 바닐라 JS 에디터를 React 컴포넌트로 감싼 래퍼.
 * 렌더링·이벤트 처리는 public/js/ 의 vanilla 클래스들이 담당하고,
 * React는 DOM 라이프사이클(마운트/언마운트)만 관리한다.
 */
export default function BmsEditor() {
  const initialized = useRef(false)

  useEffect(() => {
    // StrictMode 이중 호출 방지
    if (initialized.current) return
    initialized.current = true

    // ── 필수 클래스가 아직 로드되지 않은 경우 대비 ──
    if (
      typeof window.NoteData === 'undefined' ||
      typeof window.GridRenderer === 'undefined' ||
      typeof window.Editor === 'undefined'
    ) {
      console.error('BmsEditor: vanilla JS 클래스가 로드되지 않았습니다.')
      return
    }

    // ── 1. 코어 인스턴스 초기화 ──
    const noteData    = new window.NoteData()
    const renderer    = new window.GridRenderer('grid-canvas', noteData)
    const editor      = new window.Editor('grid-canvas', noteData, renderer)
    const midiParser  = new window.MidiParser(noteData, renderer)
    const exporter    = new window.Exporter(noteData)
    const midiRecorder = new window.MidiInputRecorder(noteData, renderer)
    const player      = new window.Player(noteData, renderer)

    editor.player = player

    // ── 2a. 에디터 모드 버튼 ──
    const editorModeBtns  = document.querySelectorAll('.editor-mode-btn')
    const noteModeOptions = document.getElementById('note-mode-options')
    const helpTextNote    = document.getElementById('help-text-note')
    const helpTextEdit    = document.getElementById('help-text-edit')

    editorModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        editorModeBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        const mode = btn.dataset.editorMode
        editor.setEditorMode(mode)
        noteModeOptions.style.display = mode === 'note' ? '' : 'none'
        helpTextNote.style.display    = mode === 'note' ? '' : 'none'
        helpTextEdit.style.display    = mode === 'edit' ? '' : 'none'
      })
    })

    // ── 2b. 노트 서브 모드 버튼 ──
    const modeBtns = document.querySelectorAll('.tool-btn')
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        editor.setMode(btn.dataset.mode)
      })
    })

    // ── 4. MIDI 파일 업로드 ──
    document.getElementById('midi-upload').addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (!file) return
      const targetLane = document.getElementById('midi-target-lane').value || 'normal_1'
      const reader = new FileReader()
      reader.onload = async (event) => {
        await midiParser.parseFromBuffer(event.target.result, targetLane)
        e.target.value = ''
      }
      reader.readAsArrayBuffer(file)
    })

    // ── 5. TXT 내보내기 ──
    document.getElementById('export-txt-btn').addEventListener('click', () => {
      exporter.downloadTXT()
    })

    // ── 5b. 음악 파일 로드 & 재생 버튼 ──
    const musicUpload   = document.getElementById('music-upload')
    const musicFilename = document.getElementById('music-filename')
    const playBtn       = document.getElementById('play-btn')

    musicUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        await player.loadMusicFile(file)
        musicFilename.textContent  = file.name
        musicFilename.style.display = ''
      } catch (err) {
        alert('음악 파일 로드 실패: ' + err.message)
      }
      e.target.value = ''
    })

    playBtn.addEventListener('click', () => {
      if (player.isPlaying) {
        player.stop()
      } else {
        player.play(1)
      }
    })

    player.onPlayStateChange = (isPlaying) => {
      playBtn.textContent = isPlaying ? '■ 정지' : '▶ 재생'
      playBtn.classList.toggle('playing', isPlaying)
    }

    // ── 6. 줌 컨트롤 ──
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      renderer.setZoom(4)
    })
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      renderer.setZoom(-4)
    })
    document.getElementById('zoom-fit-btn').addEventListener('click', () => {
      renderer.zoomFit()
    })

    // ── 7. MIDI 녹음 패널 ──
    const recordPanel    = document.getElementById('record-panel')
    const recordInitBtn  = document.getElementById('midi-record-init-btn')
    const deviceSelect   = document.getElementById('record-device-select')
    const refreshBtn     = document.getElementById('record-refresh-btn')
    const laneSelect     = document.getElementById('record-lane-select')
    const bpmInput       = document.getElementById('record-bpm-input')
    const startBtn       = document.getElementById('record-start-btn')
    const stopBtn        = document.getElementById('record-stop-btn')
    const bpmChangeBtn   = document.getElementById('record-bpmchange-btn')
    const bpmChangeInput = document.getElementById('record-bpmchange-input')
    const statusLabel    = document.getElementById('record-status')
    const clockBpmLabel  = document.getElementById('record-clock-bpm')

    function populateDevices() {
      const devices = midiRecorder.getInputDevices()
      const current = deviceSelect.value
      deviceSelect.innerHTML = '<option value="">-- 장치 선택 --</option>'
      devices.forEach(d => {
        const opt = document.createElement('option')
        opt.value = d.id
        opt.textContent = d.name
        deviceSelect.appendChild(opt)
      })
      if (current) deviceSelect.value = current
      if (devices.length === 0) {
        deviceSelect.innerHTML = '<option value="">장치 없음</option>'
      }
    }

    let midiInitialized = false
    recordInitBtn.addEventListener('click', async () => {
      const isHidden = recordPanel.classList.contains('hidden')
      if (isHidden) {
        recordPanel.classList.remove('hidden')
        if (!midiInitialized) {
          statusLabel.textContent = 'MIDI 초기화 중…'
          const inputs = await midiRecorder.init()
          midiInitialized = true
          if (inputs) {
            populateDevices()
            statusLabel.textContent = `장치 ${midiRecorder.getInputDevices().length}개 감지됨`
          } else {
            statusLabel.textContent = 'Web MIDI API 미지원 또는 권한 거부'
          }
        }
      } else {
        recordPanel.classList.add('hidden')
      }
    })

    refreshBtn.addEventListener('click', () => { populateDevices() })

    bpmInput.addEventListener('input', () => {
      if (!midiRecorder.isRecording) {
        bpmChangeInput.value = bpmInput.value
      }
    })

    startBtn.addEventListener('click', () => {
      const bpm      = parseFloat(bpmInput.value) || 120
      const lane     = laneSelect.value
      const deviceId = deviceSelect.value || undefined

      noteData.bpm = bpm
      bpmChangeInput.value = bpm

      midiRecorder.onBpmDetected = (detectedBpm) => {
        clockBpmLabel.textContent = `클럭 BPM: ${detectedBpm}`
        clockBpmLabel.classList.remove('hidden')
      }
      midiRecorder.onRecordingTick = (elapsedMs) => {
        const sec = (elapsedMs / 1000).toFixed(1)
        statusLabel.textContent = `● 녹음 중… ${sec}s`
      }

      midiRecorder.startRecording({
        bpm,
        beatsPerBar:   noteData.timeSignature.numerator,
        slotsPerBeat:  noteData.slotsPerBeat,
        targetLane:    lane,
        inputDeviceId: deviceId,
      })

      startBtn.disabled       = true
      stopBtn.disabled        = false
      bpmChangeBtn.disabled   = false
      bpmChangeInput.disabled = false
      bpmInput.disabled       = true
      laneSelect.disabled     = true
      deviceSelect.disabled   = true
      statusLabel.textContent = '● 녹음 중…'
      statusLabel.classList.add('recording')
      clockBpmLabel.classList.add('hidden')

      document.getElementById('info-bpm').textContent = `BPM: ${bpm}`
    })

    stopBtn.addEventListener('click', () => {
      midiRecorder.stopRecording()
      startBtn.disabled       = false
      stopBtn.disabled        = true
      bpmChangeBtn.disabled   = true
      bpmChangeInput.disabled = true
      bpmInput.disabled       = false
      laneSelect.disabled     = false
      deviceSelect.disabled   = false
      statusLabel.textContent = '녹음 완료'
      statusLabel.classList.remove('recording')
      midiParser.showNotification('✅ 녹음 완료')
    })

    bpmChangeBtn.addEventListener('click', () => {
      const newBpm = parseFloat(bpmChangeInput.value)
      if (!newBpm || newBpm <= 0) return
      midiRecorder.markBpmChange(newBpm)
      noteData.bpm = newBpm
      document.getElementById('info-bpm').textContent = `BPM: ${newBpm}`
      midiParser.showNotification(`♩ BPM → ${newBpm}`)
    })

    // ── 8. 그리드 분할 ──
    function syncGridUI() {
      const active    = noteData.activeGrid
      const gridInput = document.getElementById('grid-input')
      if (gridInput) gridInput.value = active
      document.querySelectorAll('.grid-preset-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.grid, 10) === active)
      })
    }

    function applyGrid(value) {
      const val = Math.max(1, Math.min(192, parseInt(value, 10)))
      if (isNaN(val)) return
      noteData.setGrid(val)
      syncGridUI()
      renderer.render()
    }

    const gridInput = document.getElementById('grid-input')
    if (gridInput) {
      gridInput.addEventListener('change', (e) => applyGrid(e.target.value))
      gridInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyGrid(e.target.value) })
    }

    document.querySelectorAll('.grid-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyGrid(btn.dataset.grid))
    })

    // ── 9. 초기 렌더링 ──
    syncGridUI()
    renderer.updateZoomUI()
    renderer.render()

    console.log('BmsEditor 초기화 완료')
  }, [])

  // ──────────────────────────────────────────────────────────────
  //  JSX — 레퍼런스 index.html 구조를 그대로 변환
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* Top Toolbar */}
      <header className="toolbar">
        <div className="toolbar-section">
          <h1 className="logo">Note Editor</h1>
        </div>

        <div className="toolbar-section info-bar" id="midi-info-bar">
          <span className="info-tag" id="info-bpm">BPM: -</span>
          <span className="info-tag" id="info-ts">박자: -</span>
          <span className="info-tag" id="info-measures">마디: -</span>
        </div>

        <div className="toolbar-section zoom-controls">
          <button className="btn small-btn" id="zoom-out-btn" title="축소">−</button>
          <span className="info-tag" id="zoom-level">100%</span>
          <button className="btn small-btn" id="zoom-in-btn" title="확대">+</button>
          <button className="btn small-btn" id="zoom-fit-btn" title="전체 보기">전체</button>
        </div>

        <div className="toolbar-section actions">
          <select id="midi-target-lane" className="record-select" title="MIDI 노트를 쓸 일반 라인 선택">
            <option value="normal_1">일반 1</option>
            <option value="normal_2">일반 2</option>
            <option value="normal_3">일반 3</option>
          </select>
          <label className="btn primary-btn">
            MIDI 로드
            <input type="file" id="midi-upload" accept=".mid,.midi" />
          </label>
          <span id="midi-bpm-lock-notice" className="info-tag midi-bpm-lock hidden">
            ⚠ 이미 MIDI 파일을 불러왔으니 BPM 변경이 불가합니다
          </span>
          <label className="btn" id="music-upload-label" title="재생할 음악 파일 선택 (MP3, OGG, WAV 등)">
            🎵 음악 로드
            <input type="file" id="music-upload" accept="audio/*" />
          </label>
          <span id="music-filename" className="info-tag" style={{ display: 'none' }}></span>
          <button id="play-btn" className="btn primary-btn">▶ 재생</button>
          <button id="export-txt-btn" className="btn">TXT 내보내기</button>
          <button id="midi-record-init-btn" className="btn">🎹 MIDI 녹음</button>
        </div>
      </header>

      {/* MIDI 녹음 패널 */}
      <div id="record-panel" className="record-panel hidden">
        <div className="record-panel-inner">
          <div className="record-row">
            <label className="record-label">입력 장치</label>
            <select id="record-device-select" className="record-select">
              <option value="">-- 장치 선택 --</option>
            </select>
            <button id="record-refresh-btn" className="btn small-btn" title="장치 목록 새로고침">↺</button>
          </div>
          <div className="record-row">
            <label className="record-label">레인</label>
            <select id="record-lane-select" className="record-select">
              <option value="normal_1">일반 1</option>
              <option value="normal_2">일반 2</option>
              <option value="normal_3">일반 3</option>
              <option value="long_1">롱 1</option>
              <option value="long_2">롱 2</option>
              <option value="long_3">롱 3</option>
              <option value="drag_1">드래그 1</option>
              <option value="drag_2">드래그 2</option>
              <option value="drag_3">드래그 3</option>
            </select>
            <label className="record-label" style={{ marginLeft: '8px' }}>BPM</label>
            <input id="record-bpm-input" type="number" className="record-number-input" defaultValue="120" min="10" max="999" step="0.001" />
          </div>
          <div className="record-row">
            <button id="record-start-btn" className="btn primary-btn">● 녹음 시작</button>
            <button id="record-stop-btn" className="btn" disabled>■ 녹음 종료</button>
            <button id="record-bpmchange-btn" className="btn" disabled title="현재 시점에 BPM 변경 마커 삽입">♩ BPM 변경</button>
            <input id="record-bpmchange-input" type="number" className="record-number-input" defaultValue="120" min="10" max="999" step="0.001" disabled />
            <span id="record-status" className="record-status">대기 중</span>
            <span id="record-clock-bpm" className="record-clock-bpm hidden"></span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="tool-group">
            <h3>그리드</h3>
            <div className="grid-input-row">
              <input type="number" id="grid-input" className="grid-number-input" defaultValue="16" min="1" max="192" title="추가할 분할 수 입력 (토글)" />
              <span className="grid-unit">분할</span>
            </div>
            <div className="grid-presets">
              <button className="grid-preset-btn" data-grid="4">4</button>
              <button className="grid-preset-btn" data-grid="8">8</button>
              <button className="grid-preset-btn" data-grid="12">12</button>
              <button className="grid-preset-btn active" data-grid="16">16</button>
              <button className="grid-preset-btn" data-grid="24">24</button>
              <button className="grid-preset-btn" data-grid="32">32</button>
              <button className="grid-preset-btn" data-grid="48">48</button>
              <button className="grid-preset-btn" data-grid="96">96</button>
            </div>
          </div>

          <div className="tool-group">
            <h3>모드</h3>
            <div className="editor-mode-selector" id="editor-mode-group">
              <button className="editor-mode-btn active" data-editor-mode="note" title="노트 모드 — 노트 생성/삭제">✏️ 노트</button>
              <button className="editor-mode-btn" data-editor-mode="edit" title="편집 모드 — 노트 위치 이동">🖱️ 편집</button>
            </div>
            <div id="note-mode-options" className="tool-group" style={{ marginTop: '4px' }}>
              <button className="tool-btn active" data-mode="write">
                <span className="color-dot normal-dot"></span> 노트 쓰기
              </button>
              <button className="tool-btn" id="delete-mode-btn" data-mode="delete">
                <span className="color-dot delete-dot">X</span> 지우개
              </button>
            </div>
          </div>

          <p className="help-text" id="help-text-note">
            <strong>노트 모드:</strong><br />
            - 휠: 상하 스크롤<br />
            - Ctrl+휠: 줌 인/아웃<br />
            - 좌클릭 (Ln): 일반 노트<br />
            - 드래그 (Ln): 롱노트 구간<br />
            - 클릭/드래그 (Drg): 드래그 노트<br />
            <strong>재생 중:</strong><br />
            - 휠: 마디 이동
          </p>
          <p className="help-text" id="help-text-edit" style={{ display: 'none' }}>
            <strong>편집 모드:</strong><br />
            - 노트 클릭+드래그:<br />
            &nbsp;&nbsp;↕ 위아래 → 타이밍 이동<br />
            &nbsp;&nbsp;↔ 좌우 → 레인 이동<br />
            - 레인 이동 시 타이밍 유지<br />
            - 롱노트도 이동 가능
          </p>
        </aside>

        {/* Center Canvas Area */}
        <main className="editor-area">
          <div className="canvas-container">
            <canvas id="grid-canvas"></canvas>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="right-panel">
          <h3>정보</h3>
          <div className="info-group">
            <p>현재 마우스 위치:</p>
            <p id="mouse-info" className="code-font">-</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
