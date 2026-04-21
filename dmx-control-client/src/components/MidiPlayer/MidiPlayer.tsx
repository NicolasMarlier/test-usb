import './MidiPlayer.scss'

import { useEffect, useRef, useState } from 'react';
import { updateProgramDmxMidi, getProgramDmxMidi } from '../../ApiClient';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';

const BEATS_OFFSET = 1
const BEAT_WIDTH_IN_PIXELS = 40

const PPQ = 480

const MidiPlayer = () => {
    const { program } = useDmxButtonsContext()
    if(!program) return <></>
    
    const { midiCurrentTick, lastReceivedMidiKey } = useRealTimeContext()

    const [dmxMidi, setDmxMidi] = useState(undefined as DmxMidi | undefined)

    const [isRecording, setIsRecording] = useState(false)

    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    const mouseDownInCanvas = useRef(undefined as {event: any, moved: boolean, ticksScroll: number} | undefined);

    const [ticksScroll, setTicksScroll] = useState(midiCurrentTick - BEATS_OFFSET)
    
    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording) {
            console.log("YO", lastReceivedMidiKey)
            const midiKey = lastReceivedMidiKey.midi
            addNoteAtTick(midiCurrentTick, midiKey)
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        setIsRecording(false)
        fetchDmxMidi()
    }, [program])

    useEffect(() => {
        redrawMidiCanvas()
    }, [dmxMidi, isRecording])

    useEffect(() => {
        setTicksScroll(midiCurrentTick - BEATS_OFFSET * PPQ)
    }, [midiCurrentTick])

    useEffect(() => {
        redrawMidiCanvas()
    }, [ticksScroll])

    

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('mousemove', handleMouseMove)
        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [dmxMidi])

    const ticksDurationToPixels = (ticksDuration: number) => ticksDuration * BEAT_WIDTH_IN_PIXELS / PPQ
    const ticksOffsetToPixels = (tick: number) => ticksDurationToPixels(tick -  ticksScroll)

    const pixelsOffsetToTicks = (pixelsOffset: number) => (pixelsOffset / BEAT_WIDTH_IN_PIXELS * PPQ + ticksScroll)
    
    const fetchDmxMidi = () => getProgramDmxMidi(program.id).then(setDmxMidi)

    const updateProgramDmxMidiAndSync = (midiNotes: MidiNote[]) => updateProgramDmxMidi(program.id, {midi_notes: midiNotes}).then(fetchDmxMidi)   

    

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

        
        const uniqueNoteMidis = [...new Set(midiNotes.map(midiNote => midiNote.midi))].toSorted()
        
        const yScale = canvas.offsetHeight / Math.max(uniqueNoteMidis.length, 2);
        

        ctx.fillStyle = "#222";
        ctx.fillRect(
            0,
            0,
            width,
            height
        );

        
        ctx.fillStyle = "#000000cc";
        ctx.fillRect(
            ticksOffsetToPixels(-BEATS_OFFSET * PPQ),
            0,
            ticksDurationToPixels(BEATS_OFFSET * PPQ),
            height
        );

        ctx.font = "20px Tahoma";
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"


        for(let tick=0; tick <= PPQ * 60 * 10; tick+= 1) {
            if(tick % PPQ == 0) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(
                    ticksOffsetToPixels(tick),
                    0,
                    1,
                    height
                )
                ctx.fillStyle = "#00000066";
                ctx.fillText(tick / PPQ, ticksOffsetToPixels(tick + PPQ / 2), height/2);
            }
            else if(tick % (PPQ / 4) == 0) {
                ctx.fillStyle = "#00000044";
                ctx.fillRect(
                    ticksOffsetToPixels(tick),
                    0,
                    1,
                    height
                )
            }
        }
    
        
        midiNotes.forEach((midiNote) => {
            ctx.fillStyle = "#ffffff44";
            if(midiCurrentTick >= midiNote.ticks && midiCurrentTick < midiNote.ticks + midiNote.durationTicks) {
                ctx.fillStyle = "#ffffffaa";
            }
            ctx.fillRect(
                ticksOffsetToPixels(midiNote.ticks) + 1,
                uniqueNoteMidis.indexOf(midiNote.midi) * yScale,
                ticksDurationToPixels(midiNote.durationTicks) - 1,
                yScale - 1
            )
        })

        ctx.fillStyle = "#fff";
        ctx.fillRect(
            ticksOffsetToPixels(midiCurrentTick),
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
    }

    const onCanvasMouseDown = (event: any) => {
        mouseDownInCanvas.current = {event: event, ticksScroll: ticksScroll, moved: false}
    }

    const onCanvasClick = (event: any) => {
        const midiNotes = dmxMidi?.midi_notes || []

        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const height = rect.height
        
        
        const aimedTick = pixelsOffsetToTicks(x)
        
        const uniqueNoteMidis = [...new Set(midiNotes.map(midiNote => midiNote.midi))].toSorted()

        const midiNoteMidi = uniqueNoteMidis[Math.floor(y / height * uniqueNoteMidis.length)]

        console.log("On canvas click", aimedTick, midiNoteMidi)

        addNoteAtTick(aimedTick, midiNoteMidi, {remove_if_exist: true})
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
    

    useEffect(() => {
        const handleResize = () => redrawMidiCanvas();

        window.addEventListener('resize', handleResize);

        // Cleanup: Remove the event listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onChange = (_event: any) => {
        //let file = event.target.files[0]
        // TODO: Implement
        //uploadMidiToProgramAndSync(file)
        return
    }

    return (<>
        <div className="scroller"/>
        <div className="midi-container">
            { false && <label htmlFor="midiFile"
                className='empty-btn upload-midi-file-btn'>
                { <>Click to upload a midi file</>}
            </label>}
            { false && <input id="midiFile" type="file" onChange={onChange} name="filename"/> }
            
            <div
                ref={canvasContainerRef}
                className="midi-canvas-container">
                    <canvas
                        ref={canvasRef}
                        id="midi-canvas"
                        width="300"
                        height="30"
                        onMouseDown={onCanvasMouseDown}
                        />
            </div>
            { (dmxMidi?.midi_notes || []).length > 0 && <div className="btn" onClick={() => updateProgramDmxMidiAndSync([])}>
                Reset
            </div>}

            { <div
                className={`btn ${isRecording ? 'active' : ''}`}
                onClick={() => setIsRecording(!isRecording)}>
                Record
            </div> }
        </div>
        
    </>)
}

export default MidiPlayer
