import EventEmitter from "events"
import { emptyDmxHexString } from "./utils"
import { DmxButton } from "./sequelize/models/dmx_button"
import DmxSet from "./dmx/effects/DmxSet"
import DmxBoom from "./dmx/effects/DmxBoom"
import DmxRun from "./dmx/effects/DmxRun"
import DmxToggle from "./dmx/effects/DmxToggle"
import { Program } from "./sequelize/models/program"
import { DmxMidiHandler } from "./dmx_midi_handler"

const LOOP_INTERVAL_MS = 20

export const DMX_LOOP_EVENTS = {
    TICK: 'tick',
    PROGRAM_CHANGE: 'programchange',
    MIDI_NOTES_UPDATED: 'midinotesupdated',
    MOCK_MIDI_INPUT: 'mockmidiinput'
}
export class DmxLoop extends EventEmitter {
    private static instance: DmxLoop;

    interval: NodeJS.Timeout | undefined
    onLoop: ((now: number) => void) | undefined
    dmxButtons: DmxButton[]
    dmx_buttons_triggered_at: { [dmx_button_id: string]: number}
    current_program_id: number | undefined
    dmx_hex_signal = emptyDmxHexString()
    dmxMidiHandler: DmxMidiHandler

  
    private constructor(current_program_id: number | undefined, dmxButtons: DmxButton[]) {
        super()
        this.dmxButtons = dmxButtons
        this.dmx_buttons_triggered_at = {}
        this.current_program_id = current_program_id
        this.dmxMidiHandler = new DmxMidiHandler({
            onMidiKey: (midiKey) => {
                console.log("YO", midiKey )
                this.triggerDmxButtonsByMidiKey(midiKey, {mock_midi_signal: true}) 
            }
                
        })
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

    triggerDmxButton = (dmxButtonId: string, options?: {mock_midi_signal?: boolean}) => {
        this.dmx_buttons_triggered_at[dmxButtonId] = Date.now()
        const dmxButton = this.dmxButtons.find((dmxButton) => dmxButton.id == dmxButtonId)
        if(dmxButton?.triggering_midi_key && options?.mock_midi_signal) {
            this.emit(DMX_LOOP_EVENTS.MOCK_MIDI_INPUT, dmxButton.triggering_midi_key)
        }
    }

    triggerDmxButtonsByMidiKey = (midiKey: MidiKey, options?: {mock_midi_signal?: boolean}) => {
        this.dmxButtons.filter((dmxButton) =>
            dmxButton.triggering_midi_key == midiKey
        ).forEach((dmxButton) => {
            this.triggerDmxButton(dmxButton.id, options)
        })
    }

    detriggerDmxButton = (dmxButtonId: string) => {
        delete this.dmx_buttons_triggered_at[dmxButtonId]
    }

    switchProgram = async(program_id: number) => {
        const program = await Program.findByPk(program_id)
        this.current_program_id = program?.id
        this.resyncDmxButtons()
        this.reloadMidi()
        this.emit(DMX_LOOP_EVENTS.PROGRAM_CHANGE, this.current_program_id)
    }

    reloadMidi = async() => {
        const program = await Program.findByPk(this.current_program_id)
        const dmxMidi = await program?.getOrInitDmxMidi()
        this.dmxMidiHandler.setMidiNotes(dmxMidi?.midi_notes || [])
    }

    applyDmxButtonToDmxSignal = (dmxButton: DmxButton, dmxHexSignal: string) => {
        const triggeredAt = this.dmx_buttons_triggered_at[dmxButton.id]
        if(!triggeredAt) return dmxHexSignal
        const completeness = Math.min(1, (Date.now() - triggeredAt) / dmxButton.duration_ms);

        const dmxEffect = {
            'Set': DmxSet,
            'Boom': DmxBoom,
            'Run': DmxRun,
            'Toggle': DmxToggle,
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

    applyAllDmxButtonsToDmxSignal = () => {
        return this.dmxButtons.reduce(
            (currentDmxHexSignal, dmxButton) => this.applyDmxButtonToDmxSignal(
                dmxButton,
                currentDmxHexSignal
            ),
            this.dmx_hex_signal
        )
    }


    start = () => {
        this.interval = setInterval(() => {            
            this.dmx_hex_signal = this.applyAllDmxButtonsToDmxSignal()
            this.emit(DMX_LOOP_EVENTS.TICK, this.dmx_hex_signal)
        }, LOOP_INTERVAL_MS);
    }
    
    stop = () => clearInterval(this.interval)
}

