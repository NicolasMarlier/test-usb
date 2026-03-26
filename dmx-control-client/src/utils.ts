export const colorArrayToHex = (colorArray: number[]) => {
    return `#${colorArray.map((color) => (color || 0).toString(16).padStart(2, "0")).join('')}`
}

export const colorHexToArray = (colorHex: string) => {
    return [
        Number(`0x${colorHex.slice(1, 3)}`),
        Number(`0x${colorHex.slice(3, 5)}`),
        Number(`0x${colorHex.slice(5, 7)}`)
    ]
}

export const setDmxAt = (dmxHexSignal: string, index: number, value: number) => {
    const hexValue = value.toString(16).padStart(2, '0')
    return dmxHexSignal.slice(0, index*2) + hexValue + dmxHexSignal.slice(index*2 + 2)
}

export const dmxSignalAt = (dmxHexSignal: string, i: number) => parseInt(dmxHexSignal.slice(2*i, 2*i + 2), 16) || 0

export const MUSIC_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', "A", 'A#', 'B']

export const humanizeSignal = (signal: string) => {
    const signalParts = signal.split('|')

    const key = parseInt(signalParts[1], 10)

    const midiKey = MUSIC_KEYS[key % MUSIC_KEYS.length]
    const midiLevel = Math.floor(key / MUSIC_KEYS.length)

    return [midiKey, midiLevel].join('')
}