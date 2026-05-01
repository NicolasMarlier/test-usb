type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type DmxHexSignal = string

type DmxEffectNature = 'Boom' | 'Set' | 'Run' | 'Toggle'

type MidiKey = number
type MidiNote = {
    ticks: number
    midi: MidiKey
    durationTicks: number
}

type MidiPattern = {
    ticks: number
    midi_notes: MidiNote[]
    durationTicks: number
    loop_until_tick?: number
}

const message = jsonMessage.data as WSMidiNoteOnMessage

type WSMidiNoteOnMessage = {
    midi: MidiKey
}

type DmxMidiControlClientToServerWsPayload = {
    channel: 'dmx-midi-control',
    data: {
        midiCurrentTick: number
    }
}