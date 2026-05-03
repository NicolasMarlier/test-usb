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
    bpm: number
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


type MidiPattern = {
    ticks: number
    midi_notes: MidiNote[]
    durationTicks: number
    loop_until_tick?: number
}

type DmxMidi = {
    midi_patterns: MidiPattern[]
}

type DmxMidiUpdateParams = {
    midi_patterns: MidiPattern[]
}

type ReceivedMidiKey = {
    midi: MidiKey,
    at: number
}


type WSMidiNoteOnMessage = {
    midi: MidiKey
}

type DmxMidiControlClientToServerWsPayload = {
    channel: 'dmx-midi-control',
    data: {
        midiCurrentTick: number
    }
}

type Rectangle = {
    x0: number
    y0: number
    x1: number
    y1: number
}

type IncomingWsPayload = any

type OutgoingWsPayload = DmxMidiControlClientToServerWsPayload

type MouseSelection = {
    mode: 'drag' | 'select',
    rect: Rectangle
}