const BEAT_WIDTH_IN_PIXELS = 40

const PPQ = 480

export const ticksDurationToPixels = (ticksDuration: number) =>
    ticksDuration * BEAT_WIDTH_IN_PIXELS / PPQ

export const ticksOffsetToPixels = (tick: number, ticksScroll: number) =>
    ticksDurationToPixels(tick -  ticksScroll)

export const pixelsOffsetToTicks = (pixelsOffset: number, ticksScroll: number, options?: {magnet?: boolean}) => {
    const aimedTick = (pixelsOffset / BEAT_WIDTH_IN_PIXELS * PPQ + ticksScroll)
    if(options?.magnet) {
        const beatMagnet = 0.25
        return PPQ * Math.floor((aimedTick / PPQ) / beatMagnet) * beatMagnet
    }
    return aimedTick
}
    



export const midiKeyToPixelsOffset = (midiKey: MidiKey, height: number, midiKeys: MidiKey[]) => {    
    return midiKeys.toSorted().indexOf(midiKey) * midiKeyToPixelsHeight(height)
        + height * 1 / 5
}

export const midiKeyToPixelsHeight = (height: number) => {
    return height * 2 / (5 * 6)
}

export const pixelsOffsetToMidiKey = (y: number, height: number, midiKeys: MidiKey[]) => (
    midiKeys.toSorted()[
        Math.floor(
            (
                y
                - height * 1 / 5
            ) / midiKeyToPixelsHeight(height)
        )
    ]
)

