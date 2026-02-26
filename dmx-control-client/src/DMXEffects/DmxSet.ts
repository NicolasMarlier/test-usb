import DmxEffect from "./DmxEffect"
import { setDmxAt } from "../utils"

class DmxSet extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        dmxButtonConfig: DmxButtonConfig,
        doneCallback: () => void
    ) => {
        let newSignal = dmxHexSignal
        dmxButtonConfig.offsets.forEach(offset => {
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 0, Math.floor(dmxButtonConfig.color[0]))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 1, Math.floor(dmxButtonConfig.color[1]))
            newSignal = setDmxAt(newSignal, 1 + offset * 3 + 2, Math.floor(dmxButtonConfig.color[2]))
        })
        doneCallback()
        return newSignal
    }
}
export default DmxSet