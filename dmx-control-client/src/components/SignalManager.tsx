import { useEffect, useState } from "react";
import Signal, { MIDI_MODES } from "../models/Signal";
import SignalComponent from "./SignalComponent";
import { useDmxButtonsContext } from "../DmxButtonsContext";
//import JZZ from 'jzz';



interface Props {
    registerSignal: (signal: Signal) => void
}
const SignalManager = ({registerSignal}: Props) => {
    const [receivedSignal, setReceivedSignal] = useState(null as Signal | null)
    const { dispatchSignals, programs } = useDmxButtonsContext()
    const [midiInputs, setMidiInputs] = useState([] as any[])

    const handleUserKeyPress = (event: any) => {
        const key = event.keyCode || event.charCode || 0;

        const signal = new Signal(
            'Keyboard',
            key
        )
        setReceivedSignal(signal)
        dispatchSignals([signal])
    }
    
    const handleMidiInput = (event: any) => {
        if(event[0] == MIDI_MODES.NOTE_ON) {
            const signal = new Signal(
                'Midi',
                event[1],
                event[2],
                event[0]
            )
            console.log(event)
            setReceivedSignal(signal)
            dispatchSignals([signal])
        }
        else if([MIDI_MODES.MIDI_CLOCK, MIDI_MODES.MIDI_START, MIDI_MODES.MIDI_STOP].indexOf(event[0]) > -1) {
            const signal = new Signal(
                'Midi',
                undefined,
                undefined,
                event[0]
            )
            if(event[0] != MIDI_MODES.MIDI_CLOCK) {
                console.log(event)
            }
            dispatchSignals([signal])
        }
        else {
            console.log(event)
        }
    }

    /*useEffect(() => {
        if(!!receivedSignal) {
            dispatchSignal(receivedSignal)  
            let intervalId = setTimeout(() => {
                setReceivedSignal(null)
            }, 1000)
            return () => clearInterval(intervalId);
        }
    }, [receivedSignal])*/

    useEffect(() => {
        document.body.addEventListener('keydown', handleUserKeyPress);
        return () => {
            document.body.removeEventListener('keydown', handleUserKeyPress);
        };  
    }, [])

    useEffect(() => {
        midiInputs.forEach((midiInput) => {
            midiInput.onmidimessage = (event: any) => {
                handleMidiInput(event.data)
            }
        })

        return () => {
            midiInputs.forEach((midiInput) => {
                midiInput.onmidimessage = undefined
            })
        }
    }, [midiInputs, programs])

    useEffect(() => {
        /*const listener = JZZ().openMidiIn().connect(handleMidiInput)
        return () => {
            listener.close()
        }*/
       navigator.requestMIDIAccess()
        .then((midiAccess) => {
            //console.log(midiAccess.inputs.values())
            setMidiInputs(Array.from(midiAccess.inputs.values()))
        })
    }, [])
    
    return <div>
        { receivedSignal && <SignalComponent
            signal={receivedSignal}
            onClick={() => registerSignal(receivedSignal)}
            />}
    </div>
}

export default SignalManager