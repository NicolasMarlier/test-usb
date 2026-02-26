
import './DmxButtonComponent.scss' 

interface Props {
    onTap: () => void
    selected: boolean
    isPlaying: boolean
    dmxButtonConfig: DmxButtonConfig
}

const DmxButtonComponent = (props: Props) => {
    const { 
        onTap,
        selected,
        isPlaying,
        dmxButtonConfig: dmxButtonConfig
    } = props

    return <div className={`dmx-button ${isPlaying ? 'playing': ''} ${selected ? 'selected' : ''}`} onClick={onTap}>
            <div className="playing-light"/>
            { dmxButtonConfig.signal && <div className="signal">
                { dmxButtonConfig.signal.shortRepresentation() }
            </div> }
        </div>
}

export default DmxButtonComponent