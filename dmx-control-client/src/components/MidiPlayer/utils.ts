const PPQ = 480

export const ticksDurationToPixels = (ticksDuration: number, pixelsPerBeat: number) =>
    ticksDuration * pixelsPerBeat / PPQ

export const ticksOffsetToPixels = (tick: number, ticksScroll: number, pixelsPerBeat: number) =>
    ticksDurationToPixels(tick -  ticksScroll, pixelsPerBeat)

export const pixelsOffsetToTicks = (pixelsOffset: number, ticksScroll: number, pixelsPerBeat: number, options?: {magnet?: boolean, magnetMode?: 'line'}) => {
    const aimedTick = (pixelsOffset / pixelsPerBeat * PPQ + ticksScroll)
    if(options?.magnet) {
        const beatMagnet = 0.25
        if(options?.magnetMode == 'line') {
            return PPQ * Math.round((aimedTick / PPQ) / beatMagnet) * beatMagnet
        }
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

export const pixelsOffsetToMidiKeyIndex = (y: number, height: number) => (
    Math.floor(
        (
            y
            - height * 1 / 5
        ) / midiKeyToPixelsHeight(height)
    )
)

export const pixelsOffsetToMidiKey = (y: number, height: number, midiKeys: MidiKey[]) => (
    midiKeys.toSorted()[
        pixelsOffsetToMidiKeyIndex(y, height)
    ]
)

const sortSegment: (segment: [number, number]) => [number, number] = ([a, b]) => (
    a > b ? [b, a] : [a, b]
)

export const doSegmentsIntersect:
    (segmentA: [number, number], segmentB: [number, number]) => boolean
    = (segmentA, segmentB) => {
    if(sortSegment(segmentB)[0] < sortSegment(segmentA)[0]) {
        return doSegmentsIntersect(segmentB, segmentA)
    }
    return sortSegment(segmentA)[0] < sortSegment(segmentB)[1] &&
        sortSegment(segmentA)[1] > sortSegment(segmentB)[0]
}

interface Rectangle {
    x0: number
    y0: number
    x1: number
    y1: number
}

export const midiNoteToRectangle = (midiNote: MidiNote, height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => ({
    x0: ticksOffsetToPixels(midiNote.ticks, ticksScroll, pixelsPerBeat),
    y0: midiKeyToPixelsOffset(midiNote.midi, height, midiKeys),
    x1: ticksOffsetToPixels(midiNote.ticks + midiNote.durationTicks, ticksScroll, pixelsPerBeat),
    y1: midiKeyToPixelsOffset(midiNote.midi, height, midiKeys) + midiKeyToPixelsHeight(height),
})

export const doRectanglesInteresect = (rectangleA: Rectangle, rectangleB: Rectangle) => (
    doSegmentsIntersect([rectangleA.x0, rectangleA.x1], [rectangleB.x0, rectangleB.x1]) &&
    doSegmentsIntersect([rectangleA.y0, rectangleA.y1], [rectangleB.y0, rectangleB.y1])
)

export const isMidiNoteInRectangle = (selection: Rectangle, midiNote: MidiNote, height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => (
    doRectanglesInteresect(selection, midiNoteToRectangle(midiNote, height, midiKeys, ticksScroll, pixelsPerBeat))
)
export const computedSelectedNotes = (selection: Rectangle, midiNotes: MidiNote[], height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => (
    midiNotes.filter(midiNote => isMidiNoteInRectangle(selection, midiNote, height, midiKeys, ticksScroll, pixelsPerBeat))
)
