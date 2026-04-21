
import { humanizeMidiKey } from '../../utils'
import './DmxButton.scss' 

interface Props {
    onTap: () => void
    selected: boolean
    isPlaying: boolean
    dmxButton: DmxButton
}

const DmxButton = (props: Props) => {
    const { 
        onTap,
        selected,
        isPlaying,
        dmxButton: dmxButton
    } = props

    return <div className={`dmx-button ${isPlaying ? 'playing': ''} ${selected ? 'selected' : ''}`}
        onClick={onTap}>
            <div className="playing-light"/>
            { dmxButton.triggering_midi_key && <div className="triggering-midi-key">
                { humanizeMidiKey(dmxButton.triggering_midi_key) }
            </div> }
        </div>
}

export default DmxButton