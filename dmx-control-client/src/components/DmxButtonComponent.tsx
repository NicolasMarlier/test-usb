
import { humanizeSignal } from '../utils'
import './DmxButtonComponent.scss' 

interface Props {
    onTap: () => void
    selected: boolean
    isPlaying: boolean
    dmxButton: DmxButton
}

const DmxButtonComponent = (props: Props) => {
    const { 
        onTap,
        selected,
        isPlaying,
        dmxButton: dmxButton
    } = props

    return <div className={`dmx-button ${isPlaying ? 'playing': ''} ${selected ? 'selected' : ''}`}
        onClick={onTap}>
            <div className="playing-light"/>
            { dmxButton.signal && <div className="signal">
                { humanizeSignal(dmxButton.signal) }
            </div> }
        </div>
}

export default DmxButtonComponent