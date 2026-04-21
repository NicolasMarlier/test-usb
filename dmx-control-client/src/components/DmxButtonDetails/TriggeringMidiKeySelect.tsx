import { useEffect, useState } from "react"
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { humanizeMidiKey } from "../../utils"

interface Props {
    value: MidiKey | undefined
    onChange: (value: MidiKey | undefined) => void
}
const TriggeringMidiKeySelect = (props: Props) => {
    const { value, onChange } = props
    const { lastReceivedMidiKey } = useRealTimeContext()

    const [midiKeyToAttach, setMidiKeyToAttach] = useState(undefined as MidiKey | undefined)

    useEffect(() => {        
        if(!!lastReceivedMidiKey) {
            setMidiKeyToAttach(lastReceivedMidiKey.midi)
            let intervalId = setTimeout(() => {
                setMidiKeyToAttach(undefined)
            }, 1000)
            return () => clearInterval(intervalId);
        }
    }, [lastReceivedMidiKey])
    
    return <>
        { !value && !midiKeyToAttach && <input
            value={'No signal'}
            disabled
            /> }
        { !value && !!midiKeyToAttach && <div className="attaching-signal" onClick={() => onChange(midiKeyToAttach)}>
            <span>Attach {humanizeMidiKey(midiKeyToAttach)} </span>
        </div> }
        { value && <input
            value={humanizeMidiKey(value)}
            disabled
            onClick={() => onChange(undefined)}
            /> }
    </>
}
export default TriggeringMidiKeySelect