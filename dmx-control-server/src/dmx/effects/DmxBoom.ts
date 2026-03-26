import { DmxButton } from "../../sequelize/models/dmx_button";
import DmxEffect from "./DmxEffect";
import { colorHexToArray, setDmxAt } from "./utils";

class DmxBoom extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton
    ) => {
        let newSignal = dmxHexSignal
        
        let colorIntensity = 1;
        if(completeness > 0.25) {
            colorIntensity = 1 - completeness
        }

        
        const colorArray = colorHexToArray(dmxButton.color)
        
        dmxButton.offsets.forEach(offset => {
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 0, Math.floor(colorArray[0] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 1, Math.floor(colorArray[1] * colorIntensity))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 2, Math.floor(colorArray[2] * colorIntensity))
        })

        return newSignal
    }
}

export default DmxBoom