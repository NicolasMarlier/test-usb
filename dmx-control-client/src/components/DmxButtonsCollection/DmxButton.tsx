
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

    const highIsLighted = dmxButton.red_channels.some(c => c < 25)
    const lowIsLighted = dmxButton.red_channels.some(c => c >= 25)

    return <div className={`dmx-button ${isPlaying ? 'playing': ''} ${selected ? 'selected' : ''}`}
        onClick={onTap}>
            <div className="playing-light"/>
            { dmxButton.triggering_midi_key && <div className="triggering-midi-key">
                { humanizeMidiKey(dmxButton.triggering_midi_key) }
            </div> }
            <div className='color-symbol high' style={highIsLighted ? {background: dmxButton.color} : {}}/>
            <div className='color-symbol low' style={lowIsLighted ? {background: dmxButton.color} : {}}/>
        </div>
}

export default DmxButton