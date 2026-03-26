import DmxBoom from '../DMXEffects/DmxBoom'
import DmxRun from '../DMXEffects/DmxRun'
import DmxSet from '../DMXEffects/DmxSet'
import OldSignal from './oldSignal'


export const DmxEffectNatures = ['Boom', 'Set', 'Run']
//const { updateDmxButton } = useDmxButtonsContext()

class OldDmxButton {
    dmxButtonConfig: DmxButtonConfig
    uuid: string
    startedAt: number | null

    
    
    constructor(dmxButtonConfig?: DmxButtonConfig, uuid?: string, startedAt?: number | null) {
        this.dmxButtonConfig = dmxButtonConfig || {
            nature: 'Set',
            signal: undefined,
            offsets: [0],
            duration: 1000,
            color: [255, 255, 255]
        }
        this.uuid = uuid || crypto.randomUUID()
        this.startedAt = startedAt || null
    }

    static fromConfig = (dmxButtonConfig: DmxButtonConfig) => {
        const signal = !dmxButtonConfig.signal ? undefined : new OldSignal(
            dmxButtonConfig.signal.source,
            dmxButtonConfig.signal.key,
            dmxButtonConfig.signal.intensity,
            dmxButtonConfig.signal.midiMode
        )
        return new OldDmxButton({...dmxButtonConfig, ...{signal}})
    }
    
    isPlaying = () => !!this.startedAt

    transformDmxSignal = (dmxHexSignal: DmxHexSignal, doneCallback?: () => void) => {
        if(!this.startedAt) { return dmxHexSignal }

        const completeness = Math.min(1, (Date.now() - this.startedAt) / this.dmxButtonConfig.duration);

        const dmxEffect = {
            'Set': DmxSet,
            'Boom': DmxBoom,
            'Run': DmxRun,
        }[this.dmxButtonConfig.nature]

        const newDmxHexSignal = dmxEffect.transformDmxHexSignal(
            dmxHexSignal,
            completeness,
            this.dmxButtonConfig,
            () => {
                this.startedAt = null
                doneCallback && doneCallback()
            }
        )

        return newDmxHexSignal
    }
}

export default OldDmxButton