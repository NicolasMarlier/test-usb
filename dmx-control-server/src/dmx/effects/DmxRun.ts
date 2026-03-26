import { DmxButton } from "../../sequelize/models/dmx_button";
import DmxEffect from "./DmxEffect";
import { colorHexToArray, setDmxAt } from "./utils"

class DmxRun extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton
    ) => {
        let newSignal = dmxHexSignal
        const spread = 2
        
        const startOffset = Math.min(...dmxButton.offsets) - 2
        const endOffset = Math.max(...dmxButton.offsets) + 2

        
        const center = startOffset + (endOffset - startOffset) * completeness

        const colorArray = colorHexToArray(dmxButton.color)

        dmxButton.offsets.forEach(offset => {

            const colorIntensity = Math.max(0, 1 - (Math.abs(center - offset) / spread))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 0, Math.floor(colorArray[0] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 1, Math.floor(colorArray[1] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 2, Math.floor(colorArray[2] * colorIntensity))
        })

        return newSignal
    }
}

export default DmxRun