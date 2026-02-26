type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type DmxButtonPartialConfig = {
    color?: number[]
    duration?: number
    offsets?: number[]
    nature?: DmxEffectNature
    signal?: Signal | undefined
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
    id: number
}