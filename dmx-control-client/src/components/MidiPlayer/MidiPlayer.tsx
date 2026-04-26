import './MidiPlayer.scss'

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateProgramDmxMidi, getProgramDmxMidi, uploadProgramAudio, getProgramAudio } from '../../ApiClient';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import Toggle from '../DesignSystem/Toggle/Toggle';
import SmallButton from '../DesignSystem/SmallButton/SmallButton';
import { RecordIcon, TrashIcon } from './Icons.js'
import { computedSelectedNotes } from './utils.js';
import { computeWave } from './utils_audio.js';
import AudioPlayer from './AudioPlayer.js';
import { redrawFullCanvas } from './CanvasDrawer.js';
import Draggable from '../DesignSystem/Draggable/Draggable.js';
import { addNoteAtTick, insertNotesAtTick, midiNoteEqual } from './utils_midi_notes.js';
import CanvasMouseHandler from './CanvasMouseHandler.js';

const BEATS_OFFSET = 0.1

const PPQ = 480

interface Props {
    program: Program
}

const MidiPlayer = (props: Props) => {
    const { program } = props
    const { dmxButtons } = useDmxButtonsContext()
    
    const { midiCurrentTick: serverMidiCurrentTick, sendCurrentTickToServer, lastReceivedMidiKey } = useRealTimeContext()

    const [dmxMidi, setDmxMidi] = useState<DmxMidi | undefined>(undefined)

    const [isRecording, setIsRecording] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseSelection = useRef<Rectangle>(null)

    const [midiCurrentTick, setMidiCurrentTick] = useState(serverMidiCurrentTick)

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET * PPQ)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)

    const [editMode, setEditMode] = useState(false)

    const aimedMidiNote = useRef<MidiNote>(null)

    const allMidiKeys = (dmxButtons.flatMap(({triggering_midi_key}) => triggering_midi_key) || []).toSorted() as MidiKey[]

    const [canvasRedrawTrigger, setCanvasRedrawTrigger] = useState(0)


    const onMouseSelect = (selection: Rectangle) => {
        if(!canvasRef.current) return

        mouseSelection.current = selection
        selectedNotes.current = computedSelectedNotes(
            selection,
            dmxMidi?.midi_notes || [],
            canvasRef.current.clientHeight,
            allMidiKeys,
            ticksScroll
        )
        redrawMidiCanvas()
    }

    const onMouseSelectEnd = () => {
        if(!canvasRef.current) return
        
        mouseSelection.current = null
        redrawMidiCanvas()
    }

    
    const onMouseOver = (args: {tick: number, midiKeyIndex: number}) => {
        const {tick, midiKeyIndex} = args
        if(tick && midiKeyIndex && midiKeyIndex >= 0 && midiKeyIndex < allMidiKeys.length) {
            const newAimedMidiNote = {
                ticks: tick,
                midi: allMidiKeys[midiKeyIndex],
                durationTicks: PPQ / 4
            }
            if(!aimedMidiNote.current || !midiNoteEqual(newAimedMidiNote, aimedMidiNote.current)) {
                aimedMidiNote.current = newAimedMidiNote
                redrawMidiCanvas()
            }
        }
        else {
            if(aimedMidiNote.current) {
                aimedMidiNote.current = null
                redrawMidiCanvas()
            }
        }   
    }

    const onMouseClick = () => {
        if(!aimedMidiNote.current) return

        updateProgramDmxMidiAndSync(
            insertNotesAtTick({
                tick: aimedMidiNote.current.ticks,
                midiNotes: dmxMidi?.midi_notes || [],
                midiNotesToInsert: [aimedMidiNote.current],
                ppq: PPQ,
                options: {
                    remove_if_exist: true
                }
            })
        )
    }
    const selectedNotes = useRef<MidiNote[]>([])

    const clipboard = useRef<MidiNote[]>([])
    const [isPlaying, setIsPlaying] = useState(false)


    const deleteSelectedMidiNotes = () => {
        updateProgramDmxMidiAndSync((dmxMidi?.midi_notes || []).filter(midiNote => (
            !selectedNotes.current.find(n => n.midi == midiNote.midi && n.ticks == midiNote.ticks)
        )))
    }

    const copySelectedMidiNotes = () => {
        clipboard.current = selectedNotes.current
    }

    const pasteSelectedMidiNotes = () => {
        updateProgramDmxMidiAndSync(
            insertNotesAtTick({
                midiNotes: dmxMidi?.midi_notes || [],
                midiNotesToInsert: clipboard.current,
                tick: midiCurrentTick,
                ppq: PPQ
            })
        )
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key == 'Backspace') deleteSelectedMidiNotes()
        else if(e.key == 'c' && e.metaKey) copySelectedMidiNotes()
        else if(e.key == 'v' && e.metaKey) pasteSelectedMidiNotes()
    }

    const fetchDmxMidi = () => getProgramDmxMidi(program.id).then(setDmxMidi)

    const fetchAudio = () => getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))

    const updateProgramDmxMidiAndSync = (midiNotes: MidiNote[]) => updateProgramDmxMidi(program.id, {midi_notes: midiNotes}).then(fetchDmxMidi)

    const redrawMidiCanvas = () => {
        if(!canvasRef.current) return

        redrawFullCanvas({
            canvas: canvasRef.current,
            midiNotes: dmxMidi?.midi_notes || [],
            selectedMidiNotes: selectedNotes.current || [],
            ppq: PPQ,
            currentMidiTick: midiCurrentTick,
            ticksScroll,
            audioWaveData,
            allMidiKeys,
            mouseSelection: mouseSelection.current,
            aimedMidiNote: aimedMidiNote.current,
        })
    }

    const triggerCanvasRedraw = () => setCanvasRedrawTrigger(p => p+1)

    useEffect(redrawMidiCanvas, [canvasRedrawTrigger])
    

    const handleWheel = (e: WheelEvent) => {
        if (!editMode) return
        
        setTicksScroll(prev => Math.max(-BEATS_OFFSET * PPQ, prev + (e.deltaX) * 10))
    }

    const onDropAudioFile = (file: File) => {
        uploadProgramAudio(program.id, file).then(fetchAudio)
    }


    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording) {
            updateProgramDmxMidiAndSync(
                addNoteAtTick({
                    tick: midiCurrentTick,
                    midiNoteMidi: lastReceivedMidiKey.midi,
                    midiNotes: dmxMidi?.midi_notes || [],
                    ppq: PPQ
                })
            )
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        setAudioUrl(undefined)
        setIsRecording(false)
        fetchDmxMidi()
        fetchAudio()
        if(!program.bpm && editMode) {
            setEditMode(false)
        }
    }, [program])

    useEffect(() => {
        if(!editMode || isPlaying) {
            setTicksScroll(midiCurrentTick - BEATS_OFFSET * PPQ)
        }
    }, [midiCurrentTick, editMode])

    useEffect(() => {
        triggerCanvasRedraw()
    }, [midiCurrentTick, ticksScroll, audioWaveData, dmxMidi, isRecording])

    

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        };
    }, [])//[dmxMidi, ticksScroll, editMode, aimedMidiNote])

    useEffect(() => {
        if(!audioUrl || !program.bpm) {
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
        if(program.bpm) {
            sendCurrentTickToServer(Math.round(currentTime * program.bpm / 60 * PPQ))
        }
    }, [program.bpm])


    useEffect(() => {
        if(!editMode || isPlaying) setMidiCurrentTick(serverMidiCurrentTick)
    }, [editMode, serverMidiCurrentTick, dmxButtons, dmxMidi?.midi_notes])    

    
    
    return (<>

        <div className="midi-container">
            <Draggable
                onDropFile={onDropAudioFile}
                className='midi-canvas-container'>
                <canvas
                    ref={canvasRef}
                    id="midi-canvas"
                    width="300"
                    height="30"
                    onWheel={handleWheel}
                    />
                { editMode && <CanvasMouseHandler
                    onClickTimeline={(tick) => setMidiCurrentTick(tick)}
                    ticksScroll={ticksScroll}
                    onSelect={onMouseSelect}
                    onSelectEnd={onMouseSelectEnd}
                    onOver={onMouseOver}
                    onClick={onMouseClick}
                    registerAgain={canvasRedrawTrigger}
                />}
            </Draggable>
            

            
            <div className='controls-panel'>
                <div className='label'>
                    <Toggle
                        value={editMode}
                        onChange={setEditMode}
                        disabled={!program.bpm}/>
                    EDIT MODE
                </div>
                <div className='label'>
                    <SmallButton
                        value={isRecording}
                        onClick={() => setIsRecording(!isRecording)}>
                        <RecordIcon/>
                    </SmallButton>
                    <SmallButton
                        onClick={() => updateProgramDmxMidiAndSync([])}>
                        <TrashIcon/>
                    </SmallButton>
                    <AudioPlayer
                        disabled={!editMode}
                        audioUrl={audioUrl}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        onCurrentTimeUpdate={followAudioCurrentTime}/>
                    
                </div>
            </div>
        </div>
        
    </>)
}

export default MidiPlayer

