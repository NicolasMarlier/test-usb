type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type MidiKey = number

type DmxButton = {
    id: string
    program_id: number
    color: string
    duration_ms: number
    red_channels: number[]
    nature: DmxEffectNature
    triggering_midi_key: MidiKey | undefined
}

type DmxButtonCreationParams = {
    program_id: number
    color?: string
    duration_ms?: number
    red_channels?: number[]
    nature?: DmxEffectNature
    triggering_midi_key?: MidiKey
}

type DmxButtonUpdateParams = {
    color?: string
    duration_ms?: number
    red_channels?: number[]
    nature?: DmxEffectNature
    triggering_midi_key?: MidiKey
}

type DmxHexSignal = string

type DmxEffectNature = 'Boom' | 'Set' | 'Run' | 'Toggle'

type Program = {
    name: string
    id: number
    bpm?: number
}

type ProgramUpdateParams = {
    name?: string
    id?: number
    bpm?: number
}

type MidiNote = {
    ticks: number
    midi: number
    durationTicks: number
}

type DmxMidi = {
    midi_notes: MidiNote[]
}

type DmxMidiUpdateParams = {
    midi_notes: MidiNote[]
}

type ReceivedMidiKey = {
    midi: MidiKey,
    at: number
}


type WSMidiNoteOnMessage = {
    midi: MidiKey
}