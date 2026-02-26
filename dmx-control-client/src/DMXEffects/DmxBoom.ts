import DmxEffect from "./DmxEffect";
import { setDmxAt } from "../utils"

class DmxBoom extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButtonConfig: DmxButtonConfig,
        doneCallback: () => void
    ) => {
        let newSignal = dmxHexSignal
        
        let colorIntensity = 1;
        if(completeness > 0.25) {
            colorIntensity = 1 - completeness
        }

        dmxButtonConfig.offsets.forEach(offset => {
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

export default DmxBoom