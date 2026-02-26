import DmxEffect from "./DmxEffect";
import { setDmxAt } from "../utils"

class DmxRun extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButtonConfig: DmxButtonConfig,
        doneCallback: () => void
    ) => {
        let newSignal = dmxHexSignal
        const spread = 2
        
        const startOffset = Math.min(...dmxButtonConfig.offsets) - 2
        const endOffset = Math.max(...dmxButtonConfig.offsets) + 2

        
        const center = startOffset + (endOffset - startOffset) * completeness

        dmxButtonConfig.offsets.forEach(offset => {

            const colorIntensity = Math.max(0, 1 - (Math.abs(center - offset) / spread))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 0, Math.floor(dmxButtonConfig.color[0] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 1, Math.floor(dmxButtonConfig.color[1] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 2, Math.floor(dmxButtonConfig.color[2] * colorIntensity))
        })

        if(completeness >= 1) {
            doneCallback()
        }

        return newSignal
    }
}

export default DmxRun