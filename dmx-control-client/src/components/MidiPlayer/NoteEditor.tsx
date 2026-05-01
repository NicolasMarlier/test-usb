import './NoteEditor.scss'
import { useEffect, useRef, useState } from 'react'
import { NOTE_ROW_HEIGHT, PIANO_KEY_WIDTH, TIMELINE_HEIGHT, redrawNoteEditor } from './NoteEditorCanvasDrawer'
import { PPQ, pixelsOffsetToTicks } from './utils'
import { buildRowKeys } from './utils_midi_notes'
import { useDmxMidiContext } from '../../contexts/DmxMidiContext'

const DEFAULT_PIXELS_PER_BEAT = 80
const DEFAULT_NOTE_DURATION_TICKS = PPQ / 4

const BEAT_MAGNET = 0.25
const QUANTIZE = PPQ * BEAT_MAGNET
const quantizeTick = (ticks: number) => PPQ * Math.round((ticks / PPQ) / BEAT_MAGNET) * BEAT_MAGNET

interface Props {
    pattern: MidiPattern
}
const NoteEditor = (props: Props) => {
    const { pattern } = props
    const {
        updateSelectedMidiPatternNotes, allMidiKeys, activeEditor, setActiveEditor,
        midiCurrentTick, setMidiCurrentTick } = useDmxMidiContext()

    const isFocused = activeEditor == 'PatternEditor'
    
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const [selectedNotes, setSelectedNotes] = useState<MidiNote[]>([])
    const [ticksScroll, setTicksScroll] = useState(0)
    const [pixelsPerBeat, setPixelsPerBeat] = useState(DEFAULT_PIXELS_PER_BEAT)
    const [ghostNote, setGhostNote] = useState<MidiNote | null>(null)

    // Mirror all values accessed in event handlers into refs so they stay fresh
    const patternRef = useRef(pattern)
    patternRef.current = pattern
    const selectedNotesRef = useRef(selectedNotes)
    selectedNotesRef.current = selectedNotes
    const ticksScrollRef = useRef(ticksScroll)
    ticksScrollRef.current = ticksScroll
    const pixelsPerBeatRef = useRef(pixelsPerBeat)
    pixelsPerBeatRef.current = pixelsPerBeat
    const onUpdateNotesRef = useRef(updateSelectedMidiPatternNotes)
    onUpdateNotesRef.current = updateSelectedMidiPatternNotes

    // Mirror controlled prop into a ref so keyboard handler (registered once) stays fresh
    const isFocusedRef = useRef(isFocused)
    isFocusedRef.current = isFocused

    const sortedMidiKeys = buildRowKeys(allMidiKeys)
    const sortedMidiKeysRef = useRef(sortedMidiKeys)
    sortedMidiKeysRef.current = sortedMidiKeys

    const canvasHeight = TIMELINE_HEIGHT + NOTE_ROW_HEIGHT * sortedMidiKeys.length

    // Drag state stored in refs — no re-registration needed
    const dragStateRef = useRef<
        | { type: 'none' }
        | { type: 'move'; startRawTick: number; startRow: number }
        | { type: 'rubber-band'; x0: number; y0: number; x1: number; y1: number }
    >({ type: 'none' })
    const selectionRectRef = useRef<Rectangle | null>(null)
    const dragDeltaRef = useRef<{ ticks: number; row: number }>({ ticks: 0, row: 0 })

    useEffect(() => {
        setSelectedNotes([])
        setTicksScroll(0)
        dragStateRef.current = { type: 'none' }
        dragDeltaRef.current = { ticks: 0, row: 0 }
        selectionRectRef.current = null
    }, [pattern?.ticks])

    const triggerRedraw = () => setGhostNote(g => g)

    // ── Coordinate helpers ────────────────────────────────────────────────────────

    const rawXToTicks = (x: number) =>
        pixelsOffsetToTicks(x - PIANO_KEY_WIDTH, patternRef.current.ticks + ticksScrollRef.current, pixelsPerBeatRef.current)

    const xToQuantizedTick = (x: number) =>
        pixelsOffsetToTicks(x - PIANO_KEY_WIDTH, patternRef.current.ticks + ticksScrollRef.current, pixelsPerBeatRef.current, { magnet: true, magnetMode: 'line' })

    const yToRowIndex = (y: number) => Math.floor((y - TIMELINE_HEIGHT) / NOTE_ROW_HEIGHT)

    const yToMidiKey = (y: number): MidiKey | undefined => sortedMidiKeysRef.current[yToRowIndex(y)]

    const noteAtPos = (x: number, y: number): MidiNote | undefined => {
        const rawTick = rawXToTicks(x)
        const midiKey = yToMidiKey(y)
        if (midiKey === undefined) return undefined
        return patternRef.current.midi_notes.find(
            n => n.midi === midiKey && n.ticks <= rawTick && n.ticks + n.durationTicks > rawTick
        )
    }

    const rowIndexOf = (note: MidiNote) => sortedMidiKeysRef.current.indexOf(note.midi)

    const noteInRect = (note: MidiNote, rect: Rectangle) => {
        const ri = rowIndexOf(note)
        if (ri < 0) return false
        const nx0 = PIANO_KEY_WIDTH + (note.ticks - patternRef.current.ticks - ticksScrollRef.current) * pixelsPerBeatRef.current / PPQ
        const nx1 = nx0 + note.durationTicks * pixelsPerBeatRef.current / PPQ
        const ny0 = TIMELINE_HEIGHT + ri * NOTE_ROW_HEIGHT
        const ny1 = ny0 + NOTE_ROW_HEIGHT
        const rx0 = Math.min(rect.x0, rect.x1), rx1 = Math.max(rect.x0, rect.x1)
        const ry0 = Math.min(rect.y0, rect.y1), ry1 = Math.max(rect.y0, rect.y1)
        return nx0 < rx1 && nx1 > rx0 && ny0 < ry1 && ny1 > ry0
    }

    const applyMoveDelta = (note: MidiNote, deltaTicks: number, deltaRow: number): MidiNote => {
        const pat = patternRef.current
        const keys = sortedMidiKeysRef.current
        const newMidi = keys[rowIndexOf(note) + deltaRow] ?? note.midi
        return {
            ...note,
            ticks: Math.max(pat.ticks, Math.min(pat.ticks + pat.durationTicks - note.durationTicks, note.ticks + deltaTicks)),
            midi: newMidi,
        }
    }

    // ── Event handlers ────────────────────────────────────────────────────────────

    const onMouseDown = (e: MouseEvent) => {
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        if (x < PIANO_KEY_WIDTH) return

        const clickedNote = noteAtPos(x, y)
        if (clickedNote) {
            const alreadySelected = selectedNotesRef.current.some(
                n => n.ticks === clickedNote.ticks && n.midi === clickedNote.midi
            )
            if (!alreadySelected)
                setSelectedNotes(e.shiftKey ? [...selectedNotesRef.current, clickedNote] : [clickedNote])
            dragStateRef.current = { type: 'move', startRawTick: rawXToTicks(x), startRow: rowIndexOf(clickedNote) }
            dragDeltaRef.current = { ticks: 0, row: 0 }
        } else if (y < TIMELINE_HEIGHT) {
            setMidiCurrentTick(xToQuantizedTick(x))
        } else {
            if (!e.shiftKey) setSelectedNotes([])
            dragStateRef.current = { type: 'rubber-band', x0: x, y0: y, x1: x, y1: y }
            selectionRectRef.current = { x0: x, y0: y, x1: x, y1: y }
            dragDeltaRef.current = { ticks: 0, row: 0 }
            triggerRedraw()
        }
    }

    const onMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const ds = dragStateRef.current

        if (ds.type === 'move') {
            dragDeltaRef.current = {
                ticks: quantizeTick(rawXToTicks(x) - ds.startRawTick),
                row: yToRowIndex(y) - ds.startRow,
            }
            triggerRedraw()
        } else if (ds.type === 'rubber-band') {
            dragStateRef.current = { ...ds, x1: x, y1: y }
            selectionRectRef.current = { x0: ds.x0, y0: ds.y0, x1: x, y1: y }
            triggerRedraw()
        } else {
            if (y > TIMELINE_HEIGHT && x > PIANO_KEY_WIDTH) {
                const mk = yToMidiKey(y)
                if (mk !== undefined) {
                    setGhostNote({ ticks: xToQuantizedTick(x), midi: mk, durationTicks: DEFAULT_NOTE_DURATION_TICKS })
                    return
                }
            }
            setGhostNote(null)
        }
    }

    const onMouseUp = (e: MouseEvent) => {
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const ds = dragStateRef.current
        const { ticks: deltaTicks, row: deltaRow } = dragDeltaRef.current

        if (ds.type === 'move') {
            const didMove = Math.abs(deltaTicks) >= QUANTIZE || deltaRow !== 0
            if (didMove && selectedNotesRef.current.length > 0) {
                const movedKeys = new Set(selectedNotesRef.current.map(n => `${n.ticks}:${n.midi}`))
                onUpdateNotesRef.current(
                    patternRef.current.midi_notes.map(n =>
                        movedKeys.has(`${n.ticks}:${n.midi}`) ? applyMoveDelta(n, deltaTicks, deltaRow) : n
                    )
                )
                setSelectedNotes(selectedNotesRef.current.map(n => applyMoveDelta(n, deltaTicks, deltaRow)))
            } else if (!didMove) {
                const clicked = noteAtPos(x, y)
                if (clicked) {
                    if (e.shiftKey) {
                        const alreadyIn = selectedNotesRef.current.some(n => n.ticks === clicked.ticks && n.midi === clicked.midi)
                        setSelectedNotes(alreadyIn
                            ? selectedNotesRef.current.filter(n => !(n.ticks === clicked.ticks && n.midi === clicked.midi))
                            : [...selectedNotesRef.current, clicked])
                    } else {
                        setSelectedNotes([clicked])
                    }
                }
            }
        } else if (ds.type === 'rubber-band') {
            const selRect = selectionRectRef.current
            if (selRect) {
                const w = Math.abs(selRect.x1 - selRect.x0)
                const h = Math.abs(selRect.y1 - selRect.y0)
                if (w > 4 || h > 4) {
                    const hits = patternRef.current.midi_notes.filter(n => noteInRect(n, selRect))
                    setSelectedNotes(e.shiftKey ? [...selectedNotesRef.current, ...hits] : hits)
                } else {
                    const mk = yToMidiKey(y)
                    const tick = xToQuantizedTick(x)
                    const pat = patternRef.current
                    if (mk !== undefined && tick >= pat.ticks && tick < pat.ticks + pat.durationTicks) {
                        onUpdateNotesRef.current([...pat.midi_notes, { ticks: tick, midi: mk, durationTicks: DEFAULT_NOTE_DURATION_TICKS }])
                    }
                }
            }
        }

        dragStateRef.current = { type: 'none' }
        selectionRectRef.current = null
        dragDeltaRef.current = { ticks: 0, row: 0 }
        triggerRedraw()
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()

        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            setTicksScroll(prev => Math.max(0, prev + e.deltaX * PPQ / pixelsPerBeatRef.current * 0.5))
        } else if(e.deltaY != 0){
            setPixelsPerBeat(prev => Math.max(20, Math.min(240, prev * (1 - e.deltaY * 0.01))))
        }
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (!isFocusedRef.current) return
        if (e.key === 'Backspace' && selectedNotesRef.current.length > 0) {
            e.preventDefault()
            const toRemove = new Set(selectedNotesRef.current.map(n => `${n.ticks}:${n.midi}`))
            onUpdateNotesRef.current(patternRef.current.midi_notes.filter(n => !toRemove.has(`${n.ticks}:${n.midi}`)))
            setSelectedNotes([])
        }
        if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            setSelectedNotes([...patternRef.current.midi_notes])
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.addEventListener('mousedown', onMouseDown)
        canvas.addEventListener('wheel', onWheel, { passive: false })
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            canvas.removeEventListener('mousedown', onMouseDown)
            canvas.removeEventListener('wheel', onWheel)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    useEffect(() => {
        const handle = () => triggerRedraw()
        window.addEventListener('resize', handle)
        return () => window.removeEventListener('resize', handle)
    }, [])

    useEffect(() => {
        if (!canvasRef.current) return
        redrawNoteEditor({
            canvas: canvasRef.current,
            pattern,
            sortedMidiKeys,
            ticksScroll,
            pixelsPerBeat,
            selectedNotes,
            ghostNote,
            currentMidiTick: midiCurrentTick,
            selectionRect: selectionRectRef.current,
            dragDeltaTicks: dragDeltaRef.current.ticks,
            dragDeltaRow: dragDeltaRef.current.row,
        })
    })

    const beatLabel = Math.round(pattern.ticks / PPQ / 4) + 1

    return (
        <div
            className={`note-editor${isFocused ? ' note-editor--focused' : ''}`}
            onMouseDown={() => setActiveEditor('PatternEditor')}
        >
            <div className="note-editor-header">
                <span className="note-editor-title">Pattern – bar {beatLabel}</span>
                <span className="note-editor-hint">
                    click to add · drag to select · drag note to move · ⌫ delete
                </span>
                <span className="note-editor-count">
                    {pattern.midi_notes.length} note{pattern.midi_notes.length !== 1 ? 's' : ''}
                    {selectedNotes.length > 0 && <> · {selectedNotes.length} selected</>}
                </span>
            </div>
            <div className="note-editor-canvas-scroll">
                <canvas
                    ref={canvasRef}
                    className="note-editor-canvas"
                    style={{ height: `${canvasHeight}px` }}
                    onMouseLeave={() => setGhostNote(null)}
                />
            </div>
        </div>
    )
}

export default NoteEditor
