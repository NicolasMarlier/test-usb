type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type DmxButtonPartialConfig = {
    color?: number[]
    duration?: number
    offsets?: number[]
    nature?: DmxEffectNature
    signal?: Signal | undefined
}

type DmxButton = {
    id: string
    program_id: number
    color: string
    duration_ms: number
    offsets: number[]
    nature: DmxEffectNature
    signal: string | undefined
}

type DmxButtonCreationParams = {
    program_id: number
    color?: string
    duration_ms?: number
    offsets?: number[]
    nature?: DmxEffectNature
    signal?: string
}

type DmxButtonUpdateParams = {
    color?: string
    duration_ms?: number
    offsets?: number[]
    nature?: DmxEffectNature
    signal?: string
}

type DmxButtonConfig = {
    color: number[]
    duration: number
    offsets: number[]
    nature: DmxEffectNature
    signal: Signal | undefined
}

type DmxHexSignal = string

type DmxEffectNature = 'Boom' | 'Set' | 'Run'

type Program = {
    name: string
    midi_filename: string
    id: number
}

type ProgramUpdateParams = {
    name?: string
    id?: number
    midi_filename?: string | null
}

type Signal = {
    source: 'Keyboard' | 'Midi'
    key?: number
    intensity?: number
    midiMode?: number
}

type MidiNote = {
    ticks: number
    name: string
    durationTicks: number
}

type MidiData = {
    filename: string
    tempo: number
    notes: MidiNote[]
}