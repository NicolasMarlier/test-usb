import './SignalComponent.scss'
import type Signal from "../models/Signal"

interface Props {
    signal: Signal
    onClick?: () => void
}
const SignalComponent = ({signal, onClick}: Props) => {    
    return <div>
        { signal.source == 'Keyboard' && <div className="keyboard-key" onClick={onClick}>
            { String.fromCharCode(signal.key) }
        </div> }
        { signal.source == 'Midi' && <div className="midi-signal" onClick={onClick}>
            <span className="midi-key">{ signal.midiKey() }</span>
            <span className="midi-level">{ signal.midiLevel() }</span>
        </div> }
    </div>
}

export default SignalComponent