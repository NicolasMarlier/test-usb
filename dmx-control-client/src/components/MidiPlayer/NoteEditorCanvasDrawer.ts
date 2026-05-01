import { PPQ, setupCanvasDPR, ticksDurationToPixels, ticksOffsetToPixels } from './utils'
import { isBlackKey, noteName } from './utils_midi_notes'

export const TIMELINE_HEIGHT = 24
export const PIANO_KEY_WIDTH = 52
export const NOTE_ROW_HEIGHT = 28

interface Props {
    canvas: HTMLCanvasElement
    pattern: MidiPattern
    sortedMidiKeys: MidiKey[]
    ticksScroll: number
    pixelsPerBeat: number
    selectedNotes: MidiNote[]
    ghostNote: MidiNote | null
    selectionRect: Rectangle | null
    dragDeltaTicks: number
    dragDeltaRow: number
}

export const redrawNoteEditor = (props: Props) => {
    const {
        canvas, pattern, sortedMidiKeys, ticksScroll, pixelsPerBeat,
        selectedNotes, ghostNote, selectionRect, dragDeltaTicks, dragDeltaRow
    } = props

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: cssWidth, height: cssHeight } = setupCanvasDPR(canvas, ctx)

    const noteAreaWidth = cssWidth - PIANO_KEY_WIDTH
    const patternStartTick = pattern.ticks

    const tickToX = (ticks: number) =>
        PIANO_KEY_WIDTH + ticksOffsetToPixels(ticks, patternStartTick + ticksScroll, pixelsPerBeat)

    const rowToY = (row: number) =>
        TIMELINE_HEIGHT + row * NOTE_ROW_HEIGHT

    const noteWidth = (durationTicks: number) =>
        Math.max(3, ticksDurationToPixels(durationTicks, pixelsPerBeat) - 1)

    // Background
    ctx.fillStyle = '#181818'
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    // Note area row backgrounds
    sortedMidiKeys.forEach((midiKey, rowIndex) => {
        const y = rowToY(rowIndex)
        ctx.fillStyle = isBlackKey(midiKey) ? '#1c1c1c' : '#222'
        ctx.fillRect(PIANO_KEY_WIDTH, y, noteAreaWidth, NOTE_ROW_HEIGHT)
        ctx.fillStyle = '#2a2a2a'
        ctx.fillRect(PIANO_KEY_WIDTH, y + NOTE_ROW_HEIGHT - 1, noteAreaWidth, 1)
    })

    // Beat grid
    for (let t = patternStartTick; t <= patternStartTick + pattern.durationTicks; t += PPQ / 4) {
        const x = tickToX(t)
        if (x < PIANO_KEY_WIDTH || x > cssWidth) continue
        const offset = t - patternStartTick
        const isBar = offset % (PPQ * 4) === 0
        const isBeat = offset % PPQ === 0
        ctx.fillStyle = isBar ? '#444' : (isBeat ? '#333' : '#262626')
        ctx.fillRect(x, TIMELINE_HEIGHT, 1, cssHeight - TIMELINE_HEIGHT)
    }

    // Notes
    pattern.midi_notes.forEach(note => {
        const rowIndex = sortedMidiKeys.indexOf(note.midi)
        if (rowIndex < 0) return

        const isSelected = selectedNotes.some(n => n.ticks === note.ticks && n.midi === note.midi)
        const displayTicks = isSelected ? note.ticks + dragDeltaTicks : note.ticks
        const displayRow = isSelected ? rowIndex + dragDeltaRow : rowIndex

        if (displayRow < 0 || displayRow >= sortedMidiKeys.length) return

        const x = tickToX(displayTicks)
        const y = rowToY(displayRow)
        const w = noteWidth(note.durationTicks)
        const h = NOTE_ROW_HEIGHT - 3

        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.beginPath(); ctx.roundRect(x + 1, y + 2, w, h, 3); ctx.fill()

        ctx.fillStyle = isSelected ? '#e8531a' : '#3ad400'
        ctx.beginPath(); ctx.roundRect(x, y + 1, w, h, 3); ctx.fill()

        ctx.fillStyle = isSelected ? 'rgba(255,160,80,0.5)' : 'rgba(150,255,80,0.5)'
        ctx.beginPath(); ctx.roundRect(x + 1, y + 2, w - 2, 3, [2, 2, 0, 0]); ctx.fill()
    })

    // Ghost note
    if (ghostNote) {
        const rowIndex = sortedMidiKeys.indexOf(ghostNote.midi)
        if (rowIndex >= 0) {
            const x = tickToX(ghostNote.ticks)
            const y = rowToY(rowIndex)
            const w = noteWidth(ghostNote.durationTicks)
            const h = NOTE_ROW_HEIGHT - 3
            ctx.fillStyle = 'rgba(58, 212, 0, 0.2)'
            ctx.beginPath(); ctx.roundRect(x, y + 1, w, h, 3); ctx.fill()
            ctx.strokeStyle = 'rgba(58, 212, 0, 0.5)'
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.roundRect(x, y + 1, w, h, 3); ctx.stroke()
        }
    }

    // Rubber band selection
    if (selectionRect) {
        const rx = Math.min(selectionRect.x0, selectionRect.x1)
        const ry = Math.min(selectionRect.y0, selectionRect.y1)
        const rw = Math.abs(selectionRect.x1 - selectionRect.x0)
        const rh = Math.abs(selectionRect.y1 - selectionRect.y0)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(rx, ry, rw, rh)
    }

    // Piano keyboard
    ctx.fillStyle = '#111'
    ctx.fillRect(0, TIMELINE_HEIGHT, PIANO_KEY_WIDTH, cssHeight - TIMELINE_HEIGHT)

    sortedMidiKeys.forEach((midiKey, rowIndex) => {
        const y = rowToY(rowIndex)
        const black = isBlackKey(midiKey)
        ctx.fillStyle = black ? '#2a2a2a' : '#d8d8d8'
        ctx.beginPath(); ctx.roundRect(3, y + 2, PIANO_KEY_WIDTH - 7, NOTE_ROW_HEIGHT - 4, 2); ctx.fill()
        if (!black) {
            ctx.fillStyle = '#555'
            ctx.font = `bold ${Math.min(10, NOTE_ROW_HEIGHT - 10)}px monospace`
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
            ctx.fillText(noteName(midiKey), PIANO_KEY_WIDTH - 8, y + NOTE_ROW_HEIGHT / 2)
        }
    })

    // Dividers
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(PIANO_KEY_WIDTH - 1, TIMELINE_HEIGHT, 1, cssHeight - TIMELINE_HEIGHT)

    // Timeline
    ctx.fillStyle = '#111'
    ctx.fillRect(PIANO_KEY_WIDTH, 0, noteAreaWidth, TIMELINE_HEIGHT)
    ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'

    for (let t = patternStartTick; t <= patternStartTick + pattern.durationTicks; t += PPQ) {
        const x = tickToX(t)
        if (x < PIANO_KEY_WIDTH || x > cssWidth) continue
        const beat = Math.round((t - patternStartTick) / PPQ) + 1
        ctx.fillStyle = '#666'; ctx.fillText(`${beat}`, x + 3, TIMELINE_HEIGHT / 2)
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x, TIMELINE_HEIGHT - 6, 1, 6)
    }

    for (let t = patternStartTick; t <= patternStartTick + pattern.durationTicks; t += PPQ / 4) {
        if ((t - patternStartTick) % PPQ === 0) continue
        const x = tickToX(t)
        if (x < PIANO_KEY_WIDTH || x > cssWidth) continue
        ctx.fillStyle = '#333'; ctx.fillRect(x, TIMELINE_HEIGHT - 3, 1, 3)
    }

    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(PIANO_KEY_WIDTH, TIMELINE_HEIGHT - 1, noteAreaWidth, 1)
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, PIANO_KEY_WIDTH, TIMELINE_HEIGHT)
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, TIMELINE_HEIGHT - 1, PIANO_KEY_WIDTH, 1)
}
