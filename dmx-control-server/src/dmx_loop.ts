import EventEmitter from "events"
import { emptyDmxHexString } from "./utils"
import { DmxButton } from "./sequelize/models/dmx_button"
import DmxSet from "./dmx/effects/DmxSet"
import DmxBoom from "./dmx/effects/DmxBoom"
import DmxRun from "./dmx/effects/DmxRun"
import { Program } from "./sequelize/models/program"
import { MidiFileHandler } from "./midi_file_handler"

const LOOP_INTERVAL_MS = 20

export const DMX_LOOP_EVENTS = {
    TICK: 'tick',
    PROGRAM_CHANGE: 'programchange'
}
export class DmxLoop extends EventEmitter {
    private static instance: DmxLoop;

    interval: NodeJS.Timeout | undefined
    onLoop: ((now: number) => void) | undefined
    dmxButtons: DmxButton[]
    dmx_buttons_triggered_at: { [dmx_button_id: string]: number}
    current_program_id: number | undefined
    dmx_hex_signal = emptyDmxHexString()
    midiFileHandler: MidiFileHandler | null

  
    private constructor(current_program_id: number | undefined, dmxButtons: DmxButton[]) {
        super()
        this.dmxButtons = dmxButtons
        this.dmx_buttons_triggered_at = {}
        this.current_program_id = current_program_id
        this.midiFileHandler = null
        this.switchToFirstProgram()
    }

    switchToFirstProgram = async() => {
        const program = await Program.findOne()

        program && this.switchProgram(program.id)
    }
    static getInstance(): DmxLoop {
        if (!DmxLoop.instance) {
            DmxLoop.instance = new DmxLoop(undefined, []);
        }
        return DmxLoop.instance;
    }

    resyncDmxButtons = async() => {
        this.dmxButtons = await DmxButton.findAll({where: {program_id: this.current_program_id},})
    }

    triggerDmxButton = (dmxButtonId: string) => {
        this.dmx_buttons_triggered_at[dmxButtonId] = Date.now()
    }

    triggerDmxButtonMatchingSignal = (signal: any) => {
        this.dmxButtons.filter((dmxButton) =>
            dmxButton.signal == `midi|${signal.data1}`
        ).forEach((dmxButton) => {
            this.triggerDmxButton(dmxButton.id)
        })
    }

    detriggerDmxButton = (dmxButtonId: string) => {
        delete this.dmx_buttons_triggered_at[dmxButtonId]
    }

    switchProgram = async(program_id: number) => {
        const program = await Program.findByPk(program_id)
        this.current_program_id = program?.id
        this.resyncDmxButtons()
        if(program?.midi_filename) {
            this.midiFileHandler = MidiFileHandler.fromFile(program?.midi_filename)
            this.midiFileHandler.on('noteon', (e) => {
                this.dmxButtons.filter((dmxButton) =>
                    dmxButton.signal && dmxButton.signal == e
                ).forEach((dmxButton) => {
                    this.triggerDmxButton(dmxButton.id)
                })
            })

        }
        this.emit(DMX_LOOP_EVENTS.PROGRAM_CHANGE, this.current_program_id)
    }


    transformDmxSignal = (dmxButton: DmxButton, dmxHexSignal: string) => {
        const triggeredAt = this.dmx_buttons_triggered_at[dmxButton.id]
        if(!triggeredAt) return dmxHexSignal
        const completeness = Math.min(1, (Date.now() - triggeredAt) / dmxButton.duration_ms);

        const dmxEffect = {
            'Set': DmxSet,
            'Boom': DmxBoom,
            'Run': DmxRun,
        }[dmxButton.nature]

        const newDmxHexSignal = dmxEffect.transformDmxHexSignal(
            dmxHexSignal,
            completeness,
            dmxButton
        )
        if(completeness >= 1) {
            this.detriggerDmxButton(dmxButton.id)
        }

        return newDmxHexSignal
    }


    start = () => {
        this.interval = setInterval(() => {            
            this.dmxButtons.forEach((dmxButton: DmxButton) => {
                this.dmx_hex_signal = this.transformDmxSignal(
                    dmxButton,
                    this.dmx_hex_signal
                )
            })

            this.emit(DMX_LOOP_EVENTS.TICK, this.dmx_hex_signal)
        }, LOOP_INTERVAL_MS);
    }
    
    stop = () => clearInterval(this.interval)
}

