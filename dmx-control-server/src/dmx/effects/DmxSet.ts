import { DmxButton } from "../../sequelize/models/dmx_button"
import DmxEffect from "./DmxEffect"
import { setDmxAt } from "./utils"
import { colorHexToArray } from "./utils"

class DmxSet extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        dmxButton: DmxButton
    ) => {
        let newSignal = dmxHexSignal

        const colorArray = colorHexToArray(dmxButton.color)

        dmxButton.offsets.forEach(offset => {
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 0, Math.floor(colorArray[0]))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 1, Math.floor(colorArray[1]))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 2, Math.floor(colorArray[2]))
        })
        return newSignal
    }
}
export default DmxSet