import { DmxButton } from "../../sequelize/models/dmx_button"

type DmxHexSignal = string

class DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        _dmxButton: DmxButton
    ) => {
        return dmxHexSignal
    }
}

export default DmxEffect