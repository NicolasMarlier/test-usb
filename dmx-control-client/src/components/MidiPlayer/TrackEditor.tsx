import './TrackEditor.scss'

import { useEffect, useRef, useState } from 'react';
import { uploadProgramAudio, getProgramAudio } from '../../ApiClient.js';
import { useRealTimeContext } from '../../contexts/RealTimeContext.js';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext.js';
import { computeWave } from './utils_audio.js';
import { redrawFullCanvas } from './TrackEditorCanvasDrawer.js';
import Draggable from '../DesignSystem/Draggable/Draggable.js';
import { addNoteAtTick, insertPatternsAtTick, magnettedTick, nextFreeTick, toggleLoopForPatterns } from './utils_midi_notes.js';
import { PPQ } from './utils.js';
import CanvasMouseHandler from './CanvasMouseHandler.js';
import { useDmxMidiContext } from '../../contexts/DmxMidiContext.js';
import { isSelected, splitPatternsAtTick, sum } from './utils_midi_patterns.js';

const BEATS_OFFSET = 2

interface Props {
    program: Program
}

const BASE_PIXELS_PER_BEAT = 40

const MidiPlayer = (props: Props) => {
    const { program } = props
    const { dmxButtons } = useDmxButtonsContext()
    const {
        midiPatterns,
        updateProgramDmxMidiAndSync,
        allMidiKeys,
        activeEditor,
        setActiveEditor,
        selectedMidiPatterns,
        setSelectedMidiPatterns,
        isRecording,

        midiCurrentTick,
        setMidiCurrentTick,
    } = useDmxMidiContext()

    const midiPatternsRef = useRef(midiPatterns)
    midiPatternsRef.current = midiPatterns
    
    const selectedMidiPatternsRef = useRef(selectedMidiPatterns)
    selectedMidiPatternsRef.current = selectedMidiPatterns
    
    const { midiCurrentTick: serverMidiCurrentTick, lastReceivedMidiKey } = useRealTimeContext()

    const midiCurrentTickRef = useRef(midiCurrentTick)
    midiCurrentTickRef.current = midiCurrentTick

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseSelection = useRef<Rectangle>(null)

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET * PPQ)
    const [pixelsPerBeat, setPixelsPerBeat] = useState(BASE_PIXELS_PER_BEAT)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)

    const aimedMidiNote = useRef<MidiNote>(null)

    const [canvasRedrawTrigger, setCanvasRedrawTrigger] = useState(0)

    const recordingPatternRef = useRef<MidiPattern>(null)

    const shiftPressed = useRef(false)


    const onMouseSelect = (selection: Rectangle) => {
        if(!canvasRef.current) return

        mouseSelection.current = selection
    }

    const onMouseSelectEnd = () => {
        if(!canvasRef.current) return
        
        mouseSelection.current = null
        redrawMidiCanvas()
    }

    const splitAtCurrentTick = () => {
        updateProgramDmxMidiAndSync(splitPatternsAtTick(midiPatterns, midiCurrentTickRef.current))
        setSelectedMidiPatterns([])
    }

    const activeEditorRef = useRef<'TrackEditor' | 'PatternEditor'>(null)
    activeEditorRef.current = activeEditor

    const clipboard = useRef<MidiPattern[]>([])


    const deleteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(
            midiPatterns.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current))
        )
    }

    const copySelectedMidiPatterns = () => {
        clipboard.current = selectedMidiPatternsRef.current
    }

    const pasteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(
            insertPatternsAtTick({
                midiPatterns,
                midiPatternsToInsert: clipboard.current,
                tick: midiCurrentTickRef.current,
                ppq: PPQ
            })
        )
    }

    const joinSelection = () => {
        updateProgramDmxMidiAndSync(
            [
                ...midiPatterns.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current)),
                ...[sum(selectedMidiPatternsRef.current)]
            ]
        )
    }

    const toggleLoop = () => {
        if(!selectedMidiPatternsRef.current) return
        updateProgramDmxMidiAndSync(toggleLoopForPatterns(midiPatterns, selectedMidiPatternsRef.current))
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if(activeEditorRef.current !== 'TrackEditor') return

        let shouldPreventDefault = true
        if(e.key == 'Backspace') deleteSelectedMidiPatterns()
        else if(e.key == 'c' && e.metaKey) copySelectedMidiPatterns()
        else if(e.key == 'v' && e.metaKey) pasteSelectedMidiPatterns()
        else if(e.key == 'a' && e.metaKey) selectAll()
        else if(e.key == 't') splitAtCurrentTick()
        else if(e.key == 'j') joinSelection()
        else if(e.key == 'l') toggleLoop()
        else if(e.key == 'ArrowLeft') {
            const targetTick = (magnettedTick(midiCurrentTickRef.current, 1) - PPQ)
            setMidiCurrentTick(targetTick)
            setTicksScroll(targetTick - PPQ)
        }
        else if(e.key == 'ArrowRight') {
            const targetTick = (magnettedTick(midiCurrentTickRef.current, 1) + PPQ)
            setMidiCurrentTick(targetTick)
            setTicksScroll(targetTick - PPQ)
        }
        else if(e.key == 'Shift') {
            shiftPressed.current = true
        }
        else {
            shouldPreventDefault = false
        }
        if(shouldPreventDefault) e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
        if(activeEditorRef.current !== 'TrackEditor') return
        let shouldPreventDefault = true
        if(e.key == 'Shift') {
            shiftPressed.current = false
        }
        if(shouldPreventDefault) e.preventDefault()
    }

    const selectAll = () => {
        setSelectedMidiPatterns(midiPatterns)
        triggerCanvasRedraw()
    }

    const redrawMidiCanvas = () => {
        if(!canvasRef.current) return
        lastCanvasRedraw.current = Date.now()

        redrawFullCanvas({
            canvas: canvasRef.current,
            midiPatterns: midiPatternsRef.current,
            selectedMidiPatterns: selectedMidiPatternsRef.current,
            recordingMidiPattern: recordingPatternRef.current,
            ppq: PPQ,
            currentMidiTick: midiCurrentTickRef.current,
            ticksScroll,
            pixelsPerBeat,
            audioWaveData,
            allMidiKeys,
            mouseSelection: mouseSelection.current,
            aimedMidiNote: aimedMidiNote.current,
        })
    }

    const triggerCanvasRedraw = () => setCanvasRedrawTrigger(p => p+1)

    const onMoveTicksScroll = (tickDelta: number) => {
        setTicksScroll(prev => Math.max(-BEATS_OFFSET * PPQ, prev + tickDelta * BASE_PIXELS_PER_BEAT / pixelsPerBeat))
    }

    const onZoom = (zoomRatio: number) => {
        setPixelsPerBeat(prev => Math.min(Math.max(2, prev*zoomRatio), BASE_PIXELS_PER_BEAT*2))
    }

    const onDropAudioFile = (file: File) => {
        uploadProgramAudio(program.id, file)
        //TODO: real-time update fetchAudio
    }

    const persistRecordingPattern = () => {
        if(!recordingPatternRef.current) return
        if(recordingPatternRef.current.midi_notes.length == 0) return

        updateProgramDmxMidiAndSync([...midiPatterns, ...[recordingPatternRef.current]])
        recordingPatternRef.current = null
    }

    useEffect(() => {
        if(isRecording) {
            if(!recordingPatternRef.current) {
                const duration = nextFreeTick(midiPatterns, midiCurrentTick) - midiCurrentTick
                if(duration > 0) {
                    recordingPatternRef.current = {
                        ticks: magnettedTick(midiCurrentTick),
                        durationTicks: duration,
                        midi_notes: []
                    }
                    triggerCanvasRedraw()
                }
            }
            else {
                //TODO: Handle case when we are after durationTicks, send to server and 
            }
        }
        else {
            if(recordingPatternRef.current) {
                persistRecordingPattern()
            }
        }
    }, [isRecording, midiCurrentTick])



    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording && recordingPatternRef.current) {
            recordingPatternRef.current = {
                ...recordingPatternRef.current,
                ...{
                    midi_notes: addNoteAtTick({
                        tick: magnettedTick(midiCurrentTick),
                        midiKey: lastReceivedMidiKey.midi,
                        midiNotes: recordingPatternRef.current.midi_notes || [],
                        ppq: PPQ
                    })
                }
            }
            triggerCanvasRedraw()
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        triggerCanvasRedraw()
    }, [midiCurrentTick, ticksScroll, audioWaveData, midiPatterns, isRecording, pixelsPerBeat])

    

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        document.addEventListener("keyup", onKeyUp)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.removeEventListener("keyup", onKeyUp)
        }
    }, [midiPatterns, ticksScroll, aimedMidiNote, midiCurrentTick])


    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)
    const fetchAudioUrl = () => {
        getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))
    }
    useEffect(fetchAudioUrl, [program])
    useEffect(() => {
        if(!audioUrl) {
            setAudioWaveData(new Uint8Array())
        }
        else {
            computeWave(audioUrl, program.bpm, PPQ).then(setAudioWaveData)
        }
        
    }, [audioUrl])

    useEffect(() => {
        const handleResize = () => triggerCanvasRedraw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onClickTimeline = (tick: number) => {
        setActiveEditor('TrackEditor')
        setMidiCurrentTick(tick)
        triggerCanvasRedraw()
    }

    const onClickMain = (tick: number) => {
        setActiveEditor('TrackEditor')
        const clickedPattern = midiPatterns.find(p => p.ticks <= tick && p.ticks + p.durationTicks > tick)
        if(clickedPattern) {
            if(shiftPressed.current) {
                setSelectedMidiPatterns([...selectedMidiPatternsRef.current, ...[clickedPattern]])
            }
            else {
                setSelectedMidiPatterns([clickedPattern])
            }
            
        }
        else {
            setSelectedMidiPatterns([])
        }
        triggerCanvasRedraw()
    }
    const onClickAudioWave = () => {
        setActiveEditor('TrackEditor')
        setSelectedMidiPatterns([])
        triggerCanvasRedraw()
    }

    useEffect(() => {
        if(midiCurrentTick != serverMidiCurrentTick) {
            setMidiCurrentTick(serverMidiCurrentTick)
            setTicksScroll(serverMidiCurrentTick - BEATS_OFFSET * PPQ)
        }
    }, [serverMidiCurrentTick, dmxButtons, midiPatterns])

    const lastCanvasRedraw = useRef<number>(null)

    useEffect(() => {
        if(lastCanvasRedraw.current && (Date.now() - lastCanvasRedraw.current < 20)) {
            const interval = setTimeout(() => {
                redrawMidiCanvas()
            }, 20 - (Date.now() - lastCanvasRedraw.current))
            return clearInterval(interval)
        }
        else {
            redrawMidiCanvas()
        }
        
    }, [canvasRedrawTrigger])
    
    return (<>
        <div className="midi-container">
            <Draggable
                onDropFile={onDropAudioFile}
                className={`midi-canvas-container${activeEditor === 'TrackEditor' ? ' midi-canvas-container--focused' : ''}`}>
                <canvas
                    ref={canvasRef}
                    id="midi-canvas"
                    width="300"
                    height="30"
                    />
                <CanvasMouseHandler
                    onClickTimeline={onClickTimeline}
                    onClickMain={onClickMain}
                    onClickAudioWave={onClickAudioWave}
                    ticksScroll={ticksScroll}
                    pixelsPerBeat={pixelsPerBeat}
                    onSelect={onMouseSelect}
                    onSelectEnd={onMouseSelectEnd}
                    onMoveTicksScroll={onMoveTicksScroll}
                    onZoom={onZoom}
                    registerAgain={canvasRedrawTrigger}
                />
            </Draggable>
        </div>
        
    </>)
}

export default MidiPlayer

