import './LedBar.scss'

import RgbDot from "./RgbDot"
import { dmxSignalAt } from "../utils"

interface Props {
    dmxHexSignal: string
    size: number
    channel: number
    selectedPods: number[]
    onSelectPod: (pod: number, selected: boolean) => void
}
const LedBar = (props: Props) => {
    const { size, dmxHexSignal, channel, selectedPods, onSelectPod} = props

    const basePod = Math.floor((channel - 1) / 3)
    return <div className="led-bar">
        { Array.from(Array(size).keys()).map((i) => (
            <RgbDot
                key={i}
                red={   dmxSignalAt(dmxHexSignal, channel + 0 + i * 3)}
                green={ dmxSignalAt(dmxHexSignal, channel + 1 + i * 3)}
                blue={  dmxSignalAt(dmxHexSignal, channel + 2 + i * 3)}
                selected={ selectedPods.includes(basePod + i)}
                onSelect={ (selected) => onSelectPod(basePod + i, selected) }
            />
        ))}
    </div>
}


export default LedBar
