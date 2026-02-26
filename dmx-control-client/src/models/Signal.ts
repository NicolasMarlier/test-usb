export type SignalSource = 'Keyboard' | 'Midi'

const MUSIC_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', "A", 'A#', 'B']

export const MIDI_MODES = {
    NOTE_ON: 128,
    PROGRAM_CHANGE: 192,
    MIDI_CLOCK: 248,
    MIDI_START: 250,
    MIDI_CONTINUE: 251,
    MIDI_STOP: 252,
}

class Signal {
    source: SignalSource
    key?: number
    intensity?: number
    midiMode?: number

    constructor(source: SignalSource, key?: number, intensity?: number, midiMode?: number) {
        this.source = source
        this.key = key
        this.intensity = intensity
        this.midiMode = midiMode
    }

    static matchSignal = (signalA: Signal | undefined, signalB: Signal | undefined) =>
        signalA && signalB &&  
        signalA.source == signalB.source &&
        signalA.key == signalB.key

    static matchAnySignal = (signalA: Signal | undefined, signals: Signal[]) =>
        signals.find((signal) => Signal.matchSignal(signalA, signal)) !== undefined

    representation = () => `${this.source}: ${this.key} ${this.intensity ? `(${this.intensity})` : ''}`

    shortRepresentation = () => {
        if(this.source == 'Keyboard') {
            return this.key ? String.fromCharCode(this.key) : 'unknown'
        }
        else {
            return `${this.midiKey()} (${this.midiLevel()})`
        }
    }

    midiKey = () => this.key && MUSIC_KEYS[this.key % MUSIC_KEYS.length]
    midiLevel = () => this.key && Math.floor(this.key / MUSIC_KEYS.length)

    
}

export default Signal