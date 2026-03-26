import './MidiReader.scss'

import { useDmxButtonsContext } from '../DmxButtonsContext';
import { useEffect, useRef, useState } from 'react';
import { getProgramMidi } from '../ApiClient';


const MidiReader = () => {
    const { uploadMidiToProgramAndSync, resetProgramMidiAndSync, program, midiCurrentTick } = useDmxButtonsContext()

    const [midiData, setMidiData] = useState(undefined as MidiData | undefined)

    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    useEffect(() => {
        if(!program) {
            setMidiData(undefined)
            return
        }
        getProgramMidi(program.id).then(setMidiData)
    }, [program])

    useEffect(() => {
        redrawMidiCanvas()
    }, [midiData])

    useEffect(() => {
        redrawMidiCanvas()
    }, [midiCurrentTick])

    const redrawMidiCanvas = () => {
        const canvas = canvasRef.current as any
        if(!canvas) return;
        const midiNotes = midiData?.notes || []

        const ctx = canvas.getContext("2d")

        
        const width = (canvasContainerRef.current as any).clientWidth - 3;
        const height = 30;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        ctx.scale(dpr, dpr);

        
        const noteNames = [...new Set(midiNotes.map(midiNote => midiNote.name))]

        const tick0InPixels = 50;

        const beatSizeInPixels = 10;
        const xOffset = 0
        const xScale = beatSizeInPixels / 120
        
        const yOffset = 0
        const yScale = canvas.offsetHeight / noteNames.length;
        

        ctx.fillStyle = "#222";
        ctx.fillRect(
            0,
            0,
            canvas.offsetWidth,
            canvas.offsetHeight
        );
        
        
        midiNotes.forEach((midiNote) => {
            ctx.fillStyle = "#444";
            if(midiCurrentTick >= midiNote.ticks && midiCurrentTick < midiNote.ticks + midiNote.durationTicks) {
                ctx.fillStyle = "#aaa";
            }
            ctx.fillRect(
                xOffset + tick0InPixels + (midiNote.ticks - midiCurrentTick) * xScale + 1,
                yOffset + noteNames.indexOf(midiNote.name) * yScale,
                xOffset + midiNote.durationTicks * xScale - 2,
                yOffset + yScale - 1
            )
        })

        ctx.fillStyle = "#fff";
        ctx.fillRect(
            tick0InPixels,
            0,
            1,
            canvas.offsetHeight
        )
        
    }

    useEffect(() => {
        const handleResize = () => redrawMidiCanvas();

        window.addEventListener('resize', handleResize);

        // Cleanup: Remove the event listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onChange = (event: any) => {
        let file = event.target.files[0]

        uploadMidiToProgramAndSync(file)
        return
    }

    return (<div className="midi-container">
        { !program?.midi_filename && <label htmlFor="midiFile"
            className='empty-btn upload-midi-file-btn'>
            { !program?.midi_filename && <>Click to upload a midi file</>}
        </label>}
        { !program?.midi_filename && <input id="midiFile" type="file" onChange={onChange} name="filename"/> }
        
        { program?.midi_filename && <div
            ref={canvasContainerRef}
            className="midi-canvas-container">
                <canvas ref={canvasRef} id="midi-canvas" width="300" height="30"/>
        </div> }
        { program?.midi_filename && <div className="btn" onClick={() => resetProgramMidiAndSync(program.id)}>
            Detach
        </div>}
        
    </div>)
}

export default MidiReader
