import './MidiPlayer.scss'

import { useEffect, useRef, useState } from 'react';
import { updateProgramDmxMidi, getProgramDmxMidi, uploadProgramAudio, getProgramAudio } from '../../ApiClient';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import Toggle from '../DesignSystem/Toggle/Toggle';
import SmallButton from '../DesignSystem/SmallButton/SmallButton';
import { PlayIcon, TrashIcon, RecordIcon, StopIcon, PauseIcon } from './Icons.js'
import { midiKeyToPixelsHeight, midiKeyToPixelsOffset, pixelsOffsetToMidiKey, pixelsOffsetToTicks, ticksDurationToPixels, ticksOffsetToPixels } from './utils.js';

const BEATS_OFFSET = 1

const PPQ = 480

const MidiPlayer = () => {
    const { program, dmxButtons } = useDmxButtonsContext()
    if(!program) return <></>
    
    const { midiCurrentTick: serverMidiCurrentTick, lastReceivedMidiKey } = useRealTimeContext()

    const [dmxMidi, setDmxMidi] = useState<DmxMidi | undefined>(undefined)

    const [isRecording, setIsRecording] = useState(false)
    const [isDraggingAudio, setIsDraggingAudio] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    const mouseOverPosition = useRef<{x: number, y: number} | undefined>(undefined)

    const mouseDownInCanvas = useRef(undefined as {event: any, moved: boolean, ticksScroll: number} | undefined);

    const [midiCurrentTick, setMidiCurrentTick] = useState(serverMidiCurrentTick)

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)

    const [editMode, setEditMode] = useState(false)

    const audio = useRef(new Audio())

    const allMidiKeys = (dmxButtons.flatMap(({triggering_midi_key}) => triggering_midi_key) || []).toSorted() as MidiKey[]
    
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
        setTicksScroll(midiCurrentTick - BEATS_OFFSET * PPQ)
    }, [midiCurrentTick])

    useEffect(() => {
        redrawMidiCanvas()
    }, [ticksScroll, audioWaveData])

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('mousemove', handleMouseMove)
        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [dmxMidi])

    useEffect(() => {
        audio.current = new Audio(audioUrl)
        computeWave().then(setAudioWaveData)
    }, [audioUrl])


    
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
        const canvas = canvasRef.current as any
        if(!canvas) return;
        if(!dmxMidi) return;
        const midiNotes = dmxMidi.midi_notes || []

        const ctx = canvas.getContext("2d")

        const width = (canvasContainerRef.current as any).clientWidth;
        const height = (canvasContainerRef.current as any).clientHeight - 2;
        
        // Handle retina screen: canvas might 300px wide, but we'll draw like it's 600px
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        ctx.scale(dpr, dpr);
    
        

        // Background
        ctx.fillStyle = "#222";
        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        // Pre-Tick0 fill
        ctx.fillStyle = "#000000cc";
        ctx.fillRect(
            ticksOffsetToPixels(-BEATS_OFFSET * PPQ, ticksScroll),
            0,
            ticksDurationToPixels(BEATS_OFFSET * PPQ),
            height
        );

        // Audio wave
        ctx.fillStyle = "#ffffff06";
        audioWaveData.forEach((dataPoint, ticks) => {
            ctx.fillRect(
                ticksOffsetToPixels(ticks, ticksScroll),
                (height - dataPoint * height / 255) / 2,
                1,
                dataPoint * height / 255
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
                midiKeyToPixelsHeight(),
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
                ctx.fillText(tick / PPQ, ticksOffsetToPixels(tick, ticksScroll) + 5, 10);
            }
        }
    

        // Midi notes
        midiNotes.forEach((midiNote) => {
            ctx.fillStyle = "#ffffffaa";

            // Fighlight when played
            if(midiCurrentTick >= midiNote.ticks && midiCurrentTick < midiNote.ticks + midiNote.durationTicks) {
                ctx.fillStyle = "#ffffffcc";
            }
            ctx.fillRect(
                ticksOffsetToPixels(midiNote.ticks, ticksScroll) + 1,
                midiKeyToPixelsOffset(midiNote.midi, height, allMidiKeys),
                ticksDurationToPixels(midiNote.durationTicks) - 1,
                midiKeyToPixelsHeight()
            )
        })

        // Mouse over
        if(mouseOverPosition.current) {
            ctx.fillStyle = "#ffffff11";
            const tick = pixelsOffsetToTicks(mouseOverPosition.current.x, ticksScroll, {magnet: true})
            const aimedMidiKey = pixelsOffsetToMidiKey(mouseOverPosition.current.y, height, allMidiKeys)
            if(aimedMidiKey) {
                ctx.fillRect(
                    ticksOffsetToPixels(tick, ticksScroll) + 1,
                    midiKeyToPixelsOffset(aimedMidiKey, height, allMidiKeys),
                    ticksDurationToPixels(PPQ / 4) - 1,
                    midiKeyToPixelsHeight()
                )
            }
            
        }

        // Current tick tracker
        ctx.fillStyle = "#fff";
        ctx.fillRect(
            ticksOffsetToPixels(midiCurrentTick, ticksScroll),
            0,
            1,
            canvas.offsetHeight
        )
    }

    const handleMouseUp = () => {
        if(!mouseDownInCanvas.current?.moved && mouseDownInCanvas?.current?.event) {
            onCanvasClick(mouseDownInCanvas.current.event)
        }
        mouseDownInCanvas.current = undefined
    }

    const handleMouseMove = (event: any) => {
        if(mouseDownInCanvas.current !== undefined) {
            if(event.screenX > mouseDownInCanvas.current.event.screenX + 2 || event.screenX < mouseDownInCanvas.current.event.screenX - 2) {
                mouseDownInCanvas.current = {
                    ...mouseDownInCanvas.current,
                    ...{ moved: true }
                }
            }
            
            
            setTicksScroll(Math.max(-BEATS_OFFSET * PPQ, mouseDownInCanvas.current.ticksScroll + (mouseDownInCanvas.current.event.screenX - event.screenX) * 30))
        }
        else {
            handleMoveOver(event)
        }
    }

    const onCanvasMouseDown = (event: any) => {
        mouseDownInCanvas.current = {event: event, ticksScroll: ticksScroll, moved: false}
    }

    const onCanvasClick = (event: any) => {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const height = rect.height
        
        
        const aimedTick = pixelsOffsetToTicks(x, ticksScroll)

        const midiNoteMidi = pixelsOffsetToMidiKey(y, height, allMidiKeys)

        addNoteAtTick(aimedTick, midiNoteMidi, {remove_if_exist: true})
    }

    const handleMoveOver = (event: any) => {
        const rect = event.target.getBoundingClientRect();

        mouseOverPosition.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        }
        redrawMidiCanvas()
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

    useEffect(() => {
        let bpm = program.bpm
        if(editMode && !!bpm) {
            const audioInterval = setInterval(() => {
                setMidiCurrentTick(Math.round(audio.current.currentTime * bpm / 60 * PPQ))
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [editMode, program])
    useEffect(() => {
        if(!editMode) setMidiCurrentTick(serverMidiCurrentTick)
    }, [editMode, serverMidiCurrentTick])


    const isPlaying = !audio.current.paused && audio.current.currentTime > 0 && !audio.current.ended

    const onScroll = (e: any) => {
        console.log("ONSCROLL", e)

    }

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
                        onScroll={onScroll}
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

