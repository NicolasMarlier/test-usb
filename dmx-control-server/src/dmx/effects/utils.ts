export const colorArrayToHex = (colorArray: number[]) => {
    return `#${colorArray.map((color) => (color || 0).toString(16).padStart(2, "0")).join('')}`
}

export const colorHexToArray: (colorHex: string) => [number, number, number] = (colorHex: string) => {
    return [
        Number(`0x${colorHex.slice(1, 3)}`) || 0,
        Number(`0x${colorHex.slice(3, 5)}`) || 0,
        Number(`0x${colorHex.slice(5, 7)}`) || 0
    ]
}

export const setDmxAt = (dmxHexSignal: string, index: number, value: number) => {
    const hexValue = value.toString(16).padStart(2, '0')
    return dmxHexSignal.slice(0, index*2) + hexValue + dmxHexSignal.slice(index*2 + 2)
}

export const dmxSignalAt = (dmxHexSignal: string, i: number) => parseInt(dmxHexSignal.slice(2*i, 2*i + 2), 16) || 0