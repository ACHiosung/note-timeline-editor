import React, { useRef, useEffect, useCallback } from 'react'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400

const BUTTON = {
  x: 320,
  y: 200,
  width: 160,
  height: 48,
  radius: 8,
  label: 'Click Me',
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function render(ctx, hovered) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Temporary text
  ctx.fillStyle = '#1e293b'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Note Timeline Editor', CANVAS_WIDTH / 2, 120)

  ctx.fillStyle = '#64748b'
  ctx.font = '16px sans-serif'
  ctx.fillText('Canvas API로 생성된 임시 텍스트입니다.', CANVAS_WIDTH / 2, 165)

  // Button
  const { x, y, width, height, radius, label } = BUTTON
  drawRoundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = hovered ? '#2563eb' : '#3b82f6'
  ctx.fill()

  if (hovered) {
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + width / 2, y + height / 2)
}

function isOverButton(x, y) {
  return (
    x >= BUTTON.x &&
    x <= BUTTON.x + BUTTON.width &&
    y >= BUTTON.y &&
    y <= BUTTON.y + BUTTON.height
  )
}

export default function App() {
  const canvasRef = useRef(null)
  const hoveredRef = useRef(false)

  const getCtx = () => canvasRef.current?.getContext('2d')

  useEffect(() => {
    const ctx = getCtx()
    if (ctx) render(ctx, false)
  }, [])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const over = isOverButton(x, y)
    if (over !== hoveredRef.current) {
      hoveredRef.current = over
      canvas.style.cursor = over ? 'pointer' : 'default'
      const ctx = canvas.getContext('2d')
      render(ctx, over)
    }
  }, [])

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (isOverButton(x, y)) {
      alert('버튼이 클릭되었습니다!')
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#e2e8f0',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
    </div>
  )
}
