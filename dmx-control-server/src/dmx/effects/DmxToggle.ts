import { DmxButton } from "../../sequelize/models/dmx_button"
import { DmxOneOffEffect } from "./DmxEffect"
import { getDmxSignalAt } from "./utils"

class DmxToggle extends DmxOneOffEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        dmxButton: DmxButton
    ) => {
        const signalSum = dmxButton.red_channels.reduce((signalSum, redChannel) => (
            signalSum +
            getDmxSignalAt(dmxHexSignal, redChannel + 0) +
            getDmxSignalAt(dmxHexSignal, redChannel + 1) +
            getDmxSignalAt(dmxHexSignal, redChannel + 2)
        ), 0)

        if (signalSum > 0) {
            return this.setToColor(dmxButton.red_channels, "#000", dmxHexSignal)
        }
        return this.setToColor(dmxButton.red_channels, dmxButton.color, dmxHexSignal)
    }
}
export default DmxToggle