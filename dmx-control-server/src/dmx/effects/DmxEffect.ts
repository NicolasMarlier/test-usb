import { DmxButton } from "../../sequelize/models/dmx_button"
import { colorHexToArray, setDmxAt } from "./utils"

type DmxHexSignal = string

class DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        _dmxButton: DmxButton
    ) => {
        return dmxHexSignal
    }

    static setToColor = (redChannels: number[], color: string, dmxHexSignal: DmxHexSignal) => {
        let newSignal = dmxHexSignal

        const colorArray = colorHexToArray(color)
        
        redChannels.forEach(redChannel => {
            newSignal = setDmxAt(newSignal, redChannel + 0, Math.floor(colorArray[0]))
            newSignal = setDmxAt(newSignal, redChannel + 1, Math.floor(colorArray[1]))
            newSignal = setDmxAt(newSignal, redChannel + 2, Math.floor(colorArray[2]))
        })
        return newSignal
    }
}

export default DmxEffect