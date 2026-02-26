import { useEffect, useRef, useState } from 'react';
import './MidiReader.scss'

import { Midi } from "@tonejs/midi";
import Signal, { MIDI_MODES } from '../models/Signal';
import { useDmxButtonsContext } from '../DmxButtonsContext';
import { uploadMidiToProgram } from '../ApiClient';

// 24 PPQM per clock event
// https://en.wikipedia.org/wiki/MIDI_beat_clock
const CLOCK_PPQM = 24

const MidiReader = () => {
    const [dragging, setDragging] = useState(false)
    const [midiData, setMidiData] = useState(null as any)
    const [midiNotes, setMidiNotes] = useState([] as any[])
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTick, setCurrentTick] = useState(0)
    const { dispatchSignals, lastSignal, addMidiToCurrentProgram } = useDmxButtonsContext()
    const myInterval = useRef(0)

    const onPlay = () => {
        setIsPlaying(true)
    }

    // useEffect(() => {
    //     if(isPlaying && midiData) {
    //         setTimeout(() => {       
    //             setCurrentTick(currentTick + 1)
    //         }, 60000 / (85 * midiData.header.ppq))
    //     }
    // }, [currentTick, isPlaying, midiData])

    useEffect(() => {
        if(lastSignal?.source == 'Midi' && lastSignal?.midiMode == MIDI_MODES.PROGRAM_CHANGE) {
            if(lastSignal?.key == 0) {
                onPause()
            }
            else if(lastSignal?.key == 1) {
                onPlay()
            }
        }
        else if(lastSignal?.source == 'Midi' && lastSignal?.midiMode == MIDI_MODES.MIDI_START) {
            onBack()
            onPlay()
        }
        else if(lastSignal?.source == 'Midi' && lastSignal?.midiMode == MIDI_MODES.MIDI_STOP) {
            onPause()
        }
        else if(lastSignal?.source == 'Midi' && lastSignal?.midiMode == MIDI_MODES.MIDI_CLOCK) {
            if(isPlaying && midiData) {
                setCurrentTick(currentTick + midiData.header.ppq / CLOCK_PPQM)
            }
        }
        
    }, [lastSignal, midiData])

    useEffect(() => {
        if(midiData) {
            const signals = midiNotes
                .filter((note: any) => note.ticks >= currentTick && note.ticks < currentTick + CLOCK_PPQM)
                .map((note: any) => new Signal(
                    'Midi',
                    note.midi,
                    note.velocity,
                    144
                ))
            if(signals.length > 0) {
                dispatchSignals(signals)
            }
            
        }
    }, [currentTick, midiNotes])

    useEffect(() => {
        console.log(midiNotes)
    }, [midiNotes])

    useEffect(() => {
        console.log(midiData)
        if(!midiData) return
        setMidiNotes(midiData
                .tracks.map((track: any) => track.notes)
                .flat())
    }, [midiData])

    const onBack = () => {
        setCurrentTick(0)
    }

    const onPause = () => {
        setIsPlaying(false)
        clearInterval(myInterval.current);
    }

    const onChange = (event: any) => {
        let file = event.target.files[0]

        addMidiToCurrentProgram(file)
        return
        let reader = new FileReader()

        reader.onload = function (event) {
            if(event?.target?.result == null) return
            let arrayBuffer = event.target.result as ArrayBuffer;
            let array = new Uint8Array(arrayBuffer);

            let fileSize = arrayBuffer.byteLength;
            let bytes = [];
            for (let i = 0; i < Math.min(20, fileSize); i++) {
                bytes.push(array[i]);
            }
            setMidiData(new Midi(arrayBuffer))
        };

        reader.readAsArrayBuffer(file);
    }

    return (<div>
        <label htmlFor="midiFile"
            className={`custom-file-upload ${dragging ? 'dragging' : ''}`}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragEnd={() => setDragging(false)}>
            { !midiData && <>Click to upload a midi file</>}
            { midiData && <>OK!</>}
            
        </label>
        <input id="midiFile" type="file" onChange={onChange} name="filename"/>
        
        { !isPlaying && <div onClick={onPlay}>Play</div>}
        { isPlaying && <div onClick={onPause}>Pause</div>}
        { !isPlaying && <div onClick={onBack}>Back</div>}
        { midiData && <div>
            {Math.floor(currentTick / midiData.header.ppq) + 1} { currentTick % midiData.header.ppq }
        </div> }
    </div>)
}

export default MidiReader
