import './TrackEditor.scss'

import { useEffect, useRef, useState } from 'react';
import { uploadProgramAudio, getProgramAudio } from '../../ApiClient.js';
import { useRealTimeContext } from '../../contexts/RealTimeContext.js';
import { computeWave } from './utils_audio.js';
import { redrawFullCanvas } from './TrackEditorCanvasDrawer.js';
import Draggable from '../DesignSystem/Draggable/Draggable.js';
import { addNoteAtTick, insertPatternsAtTick, magnettedTick, nextFreeTick, toggleLoopForPatterns } from './utils_midi_notes.js';
import { doRectanglesIntersect, midiPatternToRectangle, PPQ, xToTicks } from './utils.js';
import CanvasMouseHandler from './CanvasMouseHandler.js';
import { useDmxMidiContext } from '../../contexts/DmxMidiContext.js';
import { isSelected, midiPatternsInclude, splitPatternsAtTick, sum } from './utils_midi_patterns.js';

const BEATS_OFFSET = 2

interface Props {
    program: Program
}

const BASE_PIXELS_PER_BEAT = 40

const MidiPlayer = (props: Props) => {
    const { program } = props
    const {
        midiPatterns,
        updateProgramDmxMidiAndSync,
        allMidiKeys,
        activeEditor,
        isRecording,
        setSelectedMidiPatterns,
    } = useDmxMidiContext()

    const allMidiKeysRef = useRef(allMidiKeys)
    allMidiKeysRef.current = allMidiKeys

    const midiPatternsRef = useRef(midiPatterns)
    midiPatternsRef.current = midiPatterns
    
    const selectedMidiPatternsRef = useRef<MidiPattern[]>([])
    selectedMidiPatternsRef.current = midiPatterns.filter(p => isSelected(p, selectedMidiPatternsRef.current))
    
    const { midiCurrentTickRef, lastReceivedMidiKey } = useRealTimeContext()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseSelectionRef = useRef<MouseSelection | null>(null)

    const ticksScrollRef = useRef(0)
    const pixelsPerBeatRef = useRef(BASE_PIXELS_PER_BEAT)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)
    const audioWaveDataRef = useRef(audioWaveData)
    audioWaveDataRef.current = audioWaveData

    const recordingPatternRef = useRef<MidiPattern>(null)

    const ghostMidiPatternRef = useRef<MidiPattern | undefined>(undefined)

    const splitAtCurrentTick = () => {
        updateProgramDmxMidiAndSync(splitPatternsAtTick(midiPatternsRef.current, midiCurrentTickRef.current))
        selectedMidiPatternsRef.current = []
    }

    const activeEditorRef = useRef<'TrackEditor' | 'PatternEditor'>(null)
    activeEditorRef.current = activeEditor

    const clipboard = useRef<MidiPattern[]>([])


    const deleteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(
            midiPatternsRef.current.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current))
        )
    }

    const copySelectedMidiPatterns = () => {
        clipboard.current = selectedMidiPatternsRef.current
    }

    const pasteSelectedMidiPatterns = () => {
        updateProgramDmxMidiAndSync(
            insertPatternsAtTick({
                midiPatterns: midiPatternsRef.current,
                midiPatternsToInsert: clipboard.current,
                tick: midiCurrentTickRef.current,
                ppq: PPQ
            })
        )
    }

    const joinSelection = () => {
        updateProgramDmxMidiAndSync(
            [
                ...midiPatternsRef.current.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current)),
                ...[sum(selectedMidiPatternsRef.current)]
            ]
        )
    }

    const toggleLoop = () => {
        if(!selectedMidiPatternsRef.current) return
        updateProgramDmxMidiAndSync(toggleLoopForPatterns(midiPatternsRef.current, selectedMidiPatternsRef.current))
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if(activeEditorRef.current !== 'TrackEditor') return
        if((e.target as any).localName == 'input') return

        let shouldPreventDefault = true
        if(e.key == 'Backspace') deleteSelectedMidiPatterns()
        else if(e.key == 'c' && e.metaKey) copySelectedMidiPatterns()
        else if(e.key == 'v' && e.metaKey) pasteSelectedMidiPatterns()
        else if(e.key == 'a' && e.metaKey) selectAll()
        else if(e.key == 't') splitAtCurrentTick()
        else if(e.key == 'j') joinSelection()
        else if(e.key == 'l') toggleLoop()
        else if(e.key == 'ArrowLeft') {
            const targetTick = Math.max(0, magnettedTick(midiCurrentTickRef.current, 1) - PPQ)
            midiCurrentTickRef.current = targetTick
            ticksScrollRef.current = targetTick - BEATS_OFFSET * PPQ
        }
        else if(e.key == 'ArrowRight') {
            const targetTick = (magnettedTick(midiCurrentTickRef.current, 1) + PPQ)
            midiCurrentTickRef.current = targetTick
            ticksScrollRef.current = targetTick - BEATS_OFFSET * PPQ
        }
        else {
            shouldPreventDefault = false
        }
        if(shouldPreventDefault) e.preventDefault()
    }

    const selectAll = () => {
        selectedMidiPatternsRef.current = midiPatternsRef.current
    }

    const onDropAudioFile = (file: File) => {
        uploadProgramAudio(program.id, file)
        //TODO: real-time update fetchAudio
    }

    const persistRecordingPattern = () => {
        if(!recordingPatternRef.current) return
        if(recordingPatternRef.current.midi_notes.length == 0) return

        updateProgramDmxMidiAndSync([...midiPatternsRef.current, ...[recordingPatternRef.current]])
        recordingPatternRef.current = null
    }

    useEffect(() => {
        if(isRecording) {
            if(!recordingPatternRef.current) {
                const duration = nextFreeTick(midiPatternsRef.current, midiCurrentTickRef.current) - midiCurrentTickRef.current
                if(duration > 0) {
                    recordingPatternRef.current = {
                        ticks: magnettedTick(midiCurrentTickRef.current),
                        durationTicks: duration,
                        midi_notes: []
                    }
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
    }, [isRecording])



    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording && recordingPatternRef.current) {
            recordingPatternRef.current = {
                ...recordingPatternRef.current,
                ...{
                    midi_notes: addNoteAtTick({
                        tick: magnettedTick(midiCurrentTickRef.current),
                        midiKey: lastReceivedMidiKey.midi,
                        midiNotes: recordingPatternRef.current.midi_notes || [],
                        ppq: PPQ
                    })
                }
            }
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [])


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

    const redrawMidiCanvas = () => {
        if(!canvasRef.current) return

        redrawFullCanvas({
            canvas: canvasRef.current,
            midiPatterns: midiPatternsRef.current,
            selectedMidiPatterns: selectedMidiPatternsRef.current,
            recordingMidiPattern: recordingPatternRef.current,
            ppq: PPQ,
            currentMidiTick: midiCurrentTickRef.current,
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            audioWaveData: audioWaveDataRef.current,
            allMidiKeys: allMidiKeysRef.current,
            mouseSelection: mouseSelectionRef.current,
            ghostMidiPattern: ghostMidiPatternRef.current,
            transformMidiPattern,
        })
    }

    const mainLoop = () => {
        // TODO: find a way to handle follow-scroll
        // if(midiCurrentTickRef.current != serverMidiCurrentTickRef.current) {
        //     midiCurrentTickRef.current = serverMidiCurrentTickRef.current
        //     ticksScrollRef.current = serverMidiCurrentTickRef.current - BEATS_OFFSET * PPQ
        // }

        redrawMidiCanvas()
    }

    useEffect(() => {
        const interval = setInterval(mainLoop, 20)
        return () => clearInterval(interval)   
    }, [])

    const itemsInRect = (rect: Rectangle) => midiPatternsRef.current
        .filter(p =>
            doRectanglesIntersect(
                rect,
                midiPatternToRectangle(
                    p,
                    canvasRef.current?.getBoundingClientRect().height || 1,
                    ticksScrollRef.current,
                    pixelsPerBeatRef.current
                )
            )
        )

    const transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern = (midiPattern, x, _y) => {
        const deltaTick = xToTicks({
            x,
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            magnet: true,
            magnetBeats: 1
        })
        return {
            ...midiPattern,
            ...{
                ticks: midiPattern.ticks + deltaTick,
                midi_notes: midiPattern.midi_notes.map(n => ({...n, ...{ticks: n.ticks + deltaTick}}))
            }
        }
    }

    const patternFromXY: (x: number, y: number) => MidiPattern | undefined = (x,y) => {
        if(y < 20 || y > 50) return undefined

        return {
            ticks: xToTicks({
                x,
                ticksScroll: ticksScrollRef.current,
                pixelsPerBeat: pixelsPerBeatRef.current,
                magnet: true,
                magnetBeats: 1
            }),
            durationTicks: PPQ,
            midi_notes: []
        }
    }

    const updateSelectedMidiPatterns = (updatedMidiPatterns: MidiPattern[]) => {
        updateProgramDmxMidiAndSync([
            ...midiPatternsRef.current.filter(p =>
                !midiPatternsInclude(selectedMidiPatternsRef.current, p)
            ),
            ...updatedMidiPatterns
        ])
    }

    
    
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
                    canvasRef={canvasRef}
                    ticksScrollRef={ticksScrollRef}
                    pixelsPerBeatRef={pixelsPerBeatRef}
                    selectionRef={mouseSelectionRef}
                    selectedItemsRef={selectedMidiPatternsRef}
                    onSelectedItemsChange={() => setSelectedMidiPatterns(selectedMidiPatternsRef.current)}
                    itemsInRect={itemsInRect}
                    timelineHeight={20}
                    transformItem={transformMidiPattern}
                    updateSelectedItems={updateSelectedMidiPatterns}
                    itemFromXY={patternFromXY}
                    ghostItemRef={ghostMidiPatternRef}
                    isItemInSelection={(item, selected) => midiPatternsInclude(selected, item)}/>
            </Draggable>
        </div>
        
    </>)
}

export default MidiPlayer

