import './MidiPlayer.scss'

import { useEffect, useRef, useState } from 'react';
import { updateProgramDmxMidi, getProgramDmxMidi, uploadProgramAudio, getProgramAudio } from '../../ApiClient';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import Toggle from '../DesignSystem/Toggle/Toggle';
import SmallButton from '../DesignSystem/SmallButton/SmallButton';
import { PlayIcon, TrashIcon, RecordIcon, StopIcon, PauseIcon } from './Icons.js'
import { computedSelectedNotes, midiKeyToPixelsHeight, midiKeyToPixelsOffset, pixelsOffsetToMidiKey, pixelsOffsetToTicks, ticksDurationToPixels, ticksOffsetToPixels } from './utils.js';

const BEATS_OFFSET = 0.1

const PPQ = 480

const MidiPlayer = () => {
    const { program, dmxButtons } = useDmxButtonsContext()
    if(!program) return <></>
    
    const { midiCurrentTick: serverMidiCurrentTick, lastReceivedMidiKey } = useRealTimeContext()

    const [dmxMidi, setDmxMidi] = useState<DmxMidi | undefined>(undefined)

    const [isRecording, setIsRecording] = useState(false)
    const [isDraggingAudio, setIsDraggingAudio] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const [midiCurrentTick, setMidiCurrentTick] = useState(serverMidiCurrentTick)

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET * PPQ)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)

    const [editMode, setEditMode] = useState(false)

    const [aimedMidiNote, setAimedMidiNote] = useState<MidiNote | undefined>(undefined)

    const audio = useRef(new Audio())

    const allMidiKeys = (dmxButtons.flatMap(({triggering_midi_key}) => triggering_midi_key) || []).toSorted() as MidiKey[]

    const currentSelection = useRef<{x0: number, y0: number, x1: number, y1: number} | undefined>(undefined)
    const selectedNotes = useRef<MidiNote[]>([])
    
    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording) {
            const midiKey = lastReceivedMidiKey.midi
            addNoteAtTick(midiCurrentTick, midiKey)
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
        redrawMidiCanvas()
    }, [dmxMidi, isRecording])

    useEffect(() => {
        if(!editMode || isPlaying) {
            setTicksScroll(midiCurrentTick - BEATS_OFFSET * PPQ)
        }
    }, [midiCurrentTick, editMode])

    useEffect(() => {
        redrawMidiCanvas()
    }, [ticksScroll, audioWaveData])

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key == 'Backspace') {
            if(dmxMidi?.midi_notes && selectedNotes.current.length > 0) {
                updateProgramDmxMidiAndSync(dmxMidi?.midi_notes.filter(midiNote => (
                    !selectedNotes.current.find(n => n.midi == midiNote.midi && n.ticks == midiNote.ticks)
                )))
            }
        }
    }

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("keydown", onKeyDown)
        };
    }, [dmxMidi, ticksScroll, editMode, aimedMidiNote])

    useEffect(() => {
        audio.current = new Audio(audioUrl)
        computeWave().then(setAudioWaveData)
    }, [audioUrl])

    useEffect(() => {
        redrawMidiCanvas()
    }, [aimedMidiNote?.ticks, aimedMidiNote?.midi])

    useEffect(() => {
        redrawMidiCanvas()
    }, [currentSelection.current?.x1, currentSelection.current?.y1])

    
    const fetchDmxMidi = () => getProgramDmxMidi(program.id).then(setDmxMidi)

    const fetchAudio = () => getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))

    const updateProgramDmxMidiAndSync = (midiNotes: MidiNote[]) => updateProgramDmxMidi(program.id, {midi_notes: midiNotes}).then(fetchDmxMidi)

    const sampleSignal = (signal: Float32Array, blockSize=10) => {
        const samples = Math.ceil(signal.length / blockSize)
        const dataArray = new Uint8Array(samples)

        signal.forEach((dataPoint, i) => {
            dataArray[Math.round(i/blockSize)] = Math.max(
                dataArray[Math.round(i/blockSize)],
                Math.round(Math.abs(dataPoint) * 255)
            )
        })
        return dataArray
    }

    const computeWave = async() => {
        if(!audioUrl) { return new Uint8Array() }
        if(!program.bpm) { return new Uint8Array() }
        const audioCtx = new window.AudioContext()
        const response = await fetch(audioUrl)
        const arrayBuffer = await response.arrayBuffer()                                                                                                                                                       
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)                                                                                                                                        
        // audioBuffer.sampleRate is 44_100 or 48_000 (Hz), ie signal per second

        // 1 second = SAMPLE_RATE datapoints
        // BPM beats = 60 seconds
        // 1 beat = PPQ ticks
        // 1 tick = 60  * SAMPLE_RATE / (PPQ * BPM) datapoints

        const dataPointsPerTick = 60 * audioBuffer.sampleRate / (PPQ * program.bpm)

        
        const channelDataLeft = audioBuffer.getChannelData(0)
        const channelDataRight = audioBuffer.getChannelData(1)
        const channelData = channelDataLeft.map((e, i) => (e + channelDataRight[i])/2);

        return sampleSignal(channelData, dataPointsPerTick)
    }

    const redrawMidiCanvas = () => {
        const canvas = canvasRef.current
        if(!canvas) return;
        if(!dmxMidi) return;

        const ctx = canvas.getContext("2d")
        if(!ctx) return

        const midiNotes = dmxMidi.midi_notes || []

        const width = (canvasContainerRef.current as any).clientWidth;
        const height = (canvasContainerRef.current as any).clientHeight - 2;
        
        // Handle retina screen: canvas might 300px wide, but we'll draw like it's 600px
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        ctx.scale(dpr, dpr);
        
    
        

        // Background
        ctx.fillStyle = "#000";
        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        // Midi track
        ctx.fillStyle = "#222222";
        ctx.fillRect(
            Math.max(0, ticksOffsetToPixels(0, ticksScroll)),
            height / 5,
            width,
            2 * height / 5
        );

        // Audio wave
        ctx.fillStyle = "#ffffff06";
        audioWaveData.forEach((dataPoint, ticks) => {
            const dataPointHeight = dataPoint * height * 2 / (255 * 5)
            ctx.fillRect(
                ticksOffsetToPixels(ticks, ticksScroll),
                height * 4 / 5 - dataPointHeight / 2,
                1,
                dataPointHeight
            )
        })

        // Grid
        for(let tick=0; tick <= PPQ * 60 * 10; tick+= 1) {
            if(tick % PPQ == 0) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(
                    ticksOffsetToPixels(tick, ticksScroll),
                    0,
                    1,
                    height
                )
            }
            else if(tick % (PPQ / 4) == 0) {
                ctx.fillStyle = "#00000044";
                ctx.fillRect(
                    ticksOffsetToPixels(tick, ticksScroll),
                    0,
                    1,
                    height
                )
            }
        }

        // Horizontal grid
        allMidiKeys.forEach(midiKey => {
            ctx.fillStyle = "#00000022"
            ctx.fillRect(
                0,
                midiKeyToPixelsOffset(midiKey, height, allMidiKeys),
                width,
                1
            )
            ctx.fillRect(
                0,
                midiKeyToPixelsOffset(midiKey, height, allMidiKeys) +
                midiKeyToPixelsHeight(height),
                width,
                1
            )
        })
        
        

        // Beat numbers
        ctx.font = "14px Tahoma";
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillStyle = "#ffffff66";
        for(let tick=0; tick <= PPQ * 60 * 10; tick+= 1) {
            if(tick % PPQ == 0) {
                ctx.fillText(`${tick / PPQ}`, ticksOffsetToPixels(tick, ticksScroll) + 5, 10);
            }
        }
    

        // Midi notes
        if(!!currentSelection.current) {
            selectedNotes.current = computedSelectedNotes(currentSelection.current, midiNotes, height, allMidiKeys, ticksScroll)
        }

        midiNotes.forEach((midiNote) => {
            ctx.fillStyle = "#ffffffaa";

            // Fighlight when played
            if(selectedNotes.current.find((n) => midiNote.midi == n.midi && midiNote.ticks == n.ticks)) {
                ctx.fillStyle = "#72cb3faa";
            }
            else if(midiCurrentTick >= midiNote.ticks && midiCurrentTick < midiNote.ticks + midiNote.durationTicks) {
                ctx.fillStyle = "#ffffffcc";
            }
            ctx.fillRect(
                ticksOffsetToPixels(midiNote.ticks, ticksScroll) + 1,
                midiKeyToPixelsOffset(midiNote.midi, height, allMidiKeys),
                ticksDurationToPixels(midiNote.durationTicks) - 1,
                midiKeyToPixelsHeight(height)
            )
        })

        // Aimed midi note
        if(aimedMidiNote) {
            ctx.fillStyle = "#ffffff11";
                ctx.fillRect(
                ticksOffsetToPixels(aimedMidiNote.ticks, ticksScroll) + 1,
                midiKeyToPixelsOffset(aimedMidiNote.midi, height, allMidiKeys),
                ticksDurationToPixels(aimedMidiNote.durationTicks) - 1,
                midiKeyToPixelsHeight(height)
            )
        }

        // Current tick tracker
        ctx.fillStyle = "#fff";
        ctx.fillRect(
            ticksOffsetToPixels(midiCurrentTick, ticksScroll),
            0,
            1,
            canvas.offsetHeight
        )

        // Selection
        if(!!currentSelection.current) {
            ctx.strokeStyle = "#ffffff88";
            ctx.strokeRect(
                currentSelection.current.x0,
                currentSelection.current.y0,
                currentSelection.current.x1 - currentSelection.current.x0,
                currentSelection.current.y1 - currentSelection.current.y0,
            )
        }
    }

    const handleMouseUp = () => {
        onCanvasClick()
        currentSelection.current = undefined
    }

    const handleMouseMove = (event: any) => {
        if(!editMode) { return }
        if(
            currentSelection.current && (
                currentSelection.current.x1 > currentSelection.current.x0 + 2 ||
                currentSelection.current.x1 < currentSelection.current.x0 - 2 ||
                currentSelection.current.y1 > currentSelection.current.y0 + 2 ||
                currentSelection.current.y1 < currentSelection.current.y0 - 2
            )
        ) {
            setAimedMidiNote(undefined)     
        }
        

        if(currentSelection.current && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            currentSelection.current = {
                x0: currentSelection.current.x0,
                y0: currentSelection.current.y0,
                x1: event.clientX - rect.left,
                y1: event.clientY - rect.top,
            }
        }
        else {
            handleMoveOver(event)
        }
    }

    const onCanvasMouseDown = (event: any) => {
        const rect = event.target.getBoundingClientRect();
        currentSelection.current = {
            x0: event.clientX - rect.left,
            y0: event.clientY - rect.top,
            x1: event.clientX - rect.left,
            y1: event.clientY - rect.top,
        }
    }

    const onCanvasClick = () => {
        if(!aimedMidiNote) { return }
        if(selectedNotes.current.length > 0) {
            selectedNotes.current = []
        }
        else {
            addNoteAtTick(aimedMidiNote.ticks, aimedMidiNote.midi, {remove_if_exist: true})    
        }
    }

    const handleMoveOver = (event: any) => {
        const rect = event.target.getBoundingClientRect();
        const height = rect.height

        const midiKey = pixelsOffsetToMidiKey(event.clientY - rect.top, height, allMidiKeys)
        if(!midiKey || !editMode) {
            setAimedMidiNote(undefined)
        }
        else {
            setAimedMidiNote({
                ticks: pixelsOffsetToTicks(event.clientX - rect.left, ticksScroll, {magnet: true}),
                midi: midiKey,
                durationTicks: PPQ / 4
            })
        }
    }

    const addNoteAtTick = (tick: number, midiNoteMidi: number, options?:{remove_if_exist?: boolean}) => {
        const beatMagnet = 0.25
        const midiNotes = dmxMidi?.midi_notes || []

        const magnettedTick = PPQ * Math.floor((tick / PPQ) / beatMagnet) * beatMagnet

        const matchingMidiNote = midiNotes.find((note) => note.midi == midiNoteMidi && note.ticks == magnettedTick)
        
        if(matchingMidiNote) {
            if(options?.remove_if_exist) {
                updateProgramDmxMidiAndSync(
                    midiNotes.filter((note) => !(note.midi == midiNoteMidi && note.ticks == magnettedTick))
                )
            }
        }
        else {
            updateProgramDmxMidiAndSync([
                ...midiNotes,
                ...[{
                    ticks: magnettedTick,
                    durationTicks: PPQ * beatMagnet,
                    midi: midiNoteMidi
                }]
            ])
        }
    }
    

    const onDragOver = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingAudio(true)
    }

    const onDragLeave = () => setIsDraggingAudio(false)

    const onDrop = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingAudio(false)
        const file = event.dataTransfer.files[0]
        if (file) uploadProgramAudio(program.id, file).then(fetchAudio)
    }

    useEffect(() => {
        const handleResize = () => redrawMidiCanvas();

        window.addEventListener('resize', handleResize);

        // Cleanup: Remove the event listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isPlaying = !audio.current.paused && audio.current.currentTime > 0 && !audio.current.ended

    useEffect(() => {
        let bpm = program.bpm
        if(editMode && isPlaying && !!bpm) {
            const audioInterval = setInterval(() => {
                setMidiCurrentTick(Math.round(audio.current.currentTime * bpm / 60 * PPQ))
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [editMode, program, isPlaying])
    useEffect(() => {
        if(!editMode) setMidiCurrentTick(serverMidiCurrentTick)
    }, [editMode, serverMidiCurrentTick])


    

    useEffect(() => {
        const container = canvasContainerRef.current
        if (!container) return
        if (!editMode) return
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            setTicksScroll(prev => Math.max(-BEATS_OFFSET * PPQ, prev + (e.deltaX) * 10))
        }
        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [editMode])

    return (<>

        <div className="midi-container">
            <div
                ref={canvasContainerRef}
                className={`midi-canvas-container ${isDraggingAudio ? 'drag-over' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}>
                    <canvas
                        ref={canvasRef}
                        id="midi-canvas"
                        width="300"
                        height="30"
                        onMouseDown={onCanvasMouseDown}
                        />
            </div>
            

            
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
                        value={false}
                        onClick={() => updateProgramDmxMidiAndSync([])}
                        disabled={(dmxMidi?.midi_notes || []).length == 0}>
                        <TrashIcon/>
                    </SmallButton>
                    <SmallButton
                        value={isPlaying}
                        onClick={() => {isPlaying ? audio.current.pause() : audio.current.play() }}
                            disabled={!editMode}>
                        { isPlaying ? <PauseIcon/> : <PlayIcon/> }
                    </SmallButton>
                    <SmallButton
                        value={false}
                        onClick={() => {audio.current.pause(); audio.current.currentTime = 0}}
                        disabled={!editMode}>
                        <StopIcon/>
                    </SmallButton>
                    
                </div>
            </div>
        </div>
        
    </>)
}

export default MidiPlayer

