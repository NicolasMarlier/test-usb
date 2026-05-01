import './MidiPlayer.scss'

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadProgramAudio, getProgramAudio } from '../../ApiClient';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import Toggle from '../DesignSystem/Toggle/Toggle';
import SmallButton from '../DesignSystem/SmallButton/SmallButton';
import { RecordIcon } from './Icons.js'
import { computeWave } from './utils_audio.js';
import AudioPlayer from './AudioPlayer.js';
import { redrawFullCanvas } from './CanvasDrawer.js';
import Draggable from '../DesignSystem/Draggable/Draggable.js';
import { insertPatternsAtTick, magnettedTick } from './utils_midi_notes.js';
import { PPQ } from './utils.js';
import CanvasMouseHandler from './CanvasMouseHandler.js';
import { useDmxMidiContext } from '../../contexts/DmxMidiContext.js';
import { splitPatternsAtTick } from './utils_midi_patterns.js';

const BEATS_OFFSET = 0.1

interface Props {
    program: Program
}

const BASE_PIXELS_PER_BEAT = 40

const MidiPlayer = (props: Props) => {
    const { program } = props
    const { dmxButtons } = useDmxButtonsContext()
    const { midiPatterns, updateProgramDmxMidiAndSync, allMidiKeys, activeEditor, setActiveEditor, selectedMidiPatterns, setSelectedMidiPatterns } = useDmxMidiContext()

    const midiPatternsRef = useRef(midiPatterns)
    midiPatternsRef.current = midiPatterns
    const selectedMidiPatternsRef = useRef(selectedMidiPatterns)
    selectedMidiPatternsRef.current = selectedMidiPatterns
    
    const { midiCurrentTick: serverMidiCurrentTick, sendCurrentTickToServer, lastReceivedMidiKey } = useRealTimeContext()

    const [isRecording, setIsRecording] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseSelection = useRef<Rectangle>(null)

    const [midiCurrentTick, setMidiCurrentTick] = useState(serverMidiCurrentTick)

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET * PPQ)
    const [pixelsPerBeat, setPixelsPerBeat] = useState(BASE_PIXELS_PER_BEAT)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)

    const [editMode, setEditMode] = useState(true)

    const aimedMidiNote = useRef<MidiNote>(null)

    const [canvasRedrawTrigger, setCanvasRedrawTrigger] = useState(0)

    const [currentAudioTime, setCurrentAudioTime] = useState(0)


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
        updateProgramDmxMidiAndSync(splitPatternsAtTick(midiPatterns, midiCurrentTick))
        setSelectedMidiPatterns([])
    }

    const activeEditorRef = useRef<'TrackEditor' | 'PatternEditor'>(null)
    activeEditorRef.current = activeEditor

    const clipboard = useRef<MidiPattern[]>([])
    const [isPlaying, setIsPlaying] = useState(false)


    const deleteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(midiPatterns.filter(midiPattern => (
            selectedMidiPatternsRef.current.find(p => p.ticks == midiPattern.ticks)
        )))
    }

    const copySelectedMidiPatterns = () => {
        clipboard.current = selectedMidiPatternsRef.current
    }

    const pasteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(
            insertPatternsAtTick({
                midiPatterns,
                midiPatternsToInsert: clipboard.current,
                tick: midiCurrentTick,
                ppq: PPQ
            })
        )
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if(activeEditorRef.current !== 'TrackEditor') return

        let shouldPreventDefault = true
        if(e.key == 'Backspace') deleteSelectedMidiPatterns()
        else if(e.key == 'c' && e.metaKey) copySelectedMidiPatterns()
        else if(e.key == 'v' && e.metaKey) pasteSelectedMidiPatterns()
        else if(e.key == 'a' && e.metaKey) selectAll()
        else if(e.key == 't') splitAtCurrentTick()
        else if(e.key == 'ArrowLeft') {
            const targetTick = (magnettedTick(midiCurrentTick, PPQ, 1) - PPQ)
            setMidiCurrentTick(targetTick)
            setTicksScroll(targetTick - PPQ)
            setCurrentAudioTime(targetTick * 60 / (PPQ * program.bpm))
        }
        else if(e.key == 'ArrowRight') {
            const targetTick = (magnettedTick(midiCurrentTick, PPQ, 1) + PPQ)
            setMidiCurrentTick(targetTick)
            setTicksScroll(targetTick - PPQ)
            setCurrentAudioTime(targetTick * 60 / (PPQ * program.bpm))
        }
        else {
            shouldPreventDefault = false
        }
        if(shouldPreventDefault) e.preventDefault()
    }

    const fetchAudio = () => getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))

    const selectAll = () => {
        setSelectedMidiPatterns(midiPatterns)
        triggerCanvasRedraw()
    }

    const redrawMidiCanvas = () => {
        if(!canvasRef.current) return
        lastCanvasRedraw.current = Date.now()
        console.log('redraw')

        redrawFullCanvas({
            canvas: canvasRef.current,
            midiPatterns: midiPatternsRef.current,
            selectedMidiPatterns: selectedMidiPatternsRef.current,
            ppq: PPQ,
            currentMidiTick: midiCurrentTick,
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
        uploadProgramAudio(program.id, file).then(fetchAudio)
    }


    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording) {
            //TODO: Reimplement isRecording
            /*
            updateProgramDmxMidiAndSync(
                addNoteAtTick({
                    tick: midiCurrentTick,
                    midiKey: lastReceivedMidiKey.midi,
                    midiNotes: dmxMidi?.midi_notes || [],
                    ppq: PPQ
                })
            )
            */
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        setAudioUrl(undefined)
        setIsRecording(false)
        fetchAudio()
    }, [program])

    useEffect(() => {
        triggerCanvasRedraw()
    }, [midiCurrentTick, ticksScroll, audioWaveData, midiPatterns, isRecording, pixelsPerBeat])

    

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [midiPatterns, ticksScroll, editMode, aimedMidiNote, midiCurrentTick])

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

        // Cleanup: Remove the event listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const followAudioCurrentTime = useCallback((currentTime: number) => {
        sendCurrentTickToServer(Math.round(currentTime * program.bpm / 60 * PPQ))
    }, [program.bpm])

    const onClickTimeline = (tick: number) => {
        setActiveEditor('TrackEditor')
        setMidiCurrentTick(tick)
        setCurrentAudioTime(tick * 60 / (PPQ * program.bpm))
        triggerCanvasRedraw()
    }

    const onClickMain = (tick: number) => {
        setActiveEditor('TrackEditor')
        const clickedPattern = midiPatterns.find(p => p.ticks <= tick && p.ticks + p.durationTicks > tick)
        if(clickedPattern) {
            setSelectedMidiPatterns([clickedPattern])
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
        if(!editMode || isPlaying) setMidiCurrentTick(serverMidiCurrentTick)
    }, [editMode, serverMidiCurrentTick, dmxButtons, midiPatterns])

    useEffect(() => {
        if(!editMode || isPlaying) setTicksScroll(midiCurrentTick - BEATS_OFFSET * PPQ)
    }, [midiCurrentTick, editMode])

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
                { editMode && <CanvasMouseHandler
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
                />}
            </Draggable>
            

            
            <div className='controls-panel'>
                <div className='label'>
                    <Toggle
                        value={editMode}
                        onChange={setEditMode}/>
                    EDIT MODE
                </div>
                <div className='small-buttons-bar'>
                    <SmallButton
                        value={isRecording}
                        onClick={() => setIsRecording(!isRecording)}>
                        <RecordIcon/>
                    </SmallButton>
                    <AudioPlayer
                        disabled={!editMode}
                        audioUrl={audioUrl}
                        isPlaying={isPlaying}
                        currentTime={currentAudioTime}
                        setIsPlaying={setIsPlaying}
                        onCurrentTimeUpdate={followAudioCurrentTime}/>
                </div>
            </div>
        </div>
        
    </>)
}

export default MidiPlayer

