import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { humanizeMidiKey } from "../../utils"

interface Props {
    value: MidiKey | undefined
    onChange: (value: MidiKey | undefined) => void
}
const TriggeringMidiKeySelect = (props: Props) => {
    const { value, onChange } = props
    const { lastReceivedMidiKey } = useRealTimeContext()
    
    return <>
        { !value && !lastReceivedMidiKey && <input
            value={'No signal'}
            disabled
            /> }
        { !value && !!lastReceivedMidiKey && <div
            className="attaching-signal"
            onClick={() => onChange(lastReceivedMidiKey.midi)}>
            <span>Attach {humanizeMidiKey(lastReceivedMidiKey.midi)} </span>
        </div> }
        { value && <input
            value={humanizeMidiKey(value)}
            disabled
            onClick={() => onChange(undefined)}
            /> }
    </>
}
export default TriggeringMidiKeySelect