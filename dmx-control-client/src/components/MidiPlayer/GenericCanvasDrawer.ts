import { ticksOffsetToPixels } from "./utils"

export interface DrawerFunctionProps {
    canvas: HTMLCanvasElement,
    width: number
    height: number
    ctx: CanvasRenderingContext2D
    ticksScroll: number
    pixelsPerBeat: number
    ppq: number
    allMidiKeys: MidiKey[]
    baseXOffset?: number
}

export const drawCurrentTick = (props: DrawerFunctionProps, currentMidiTick: number) => {
    const { ctx, ticksScroll, pixelsPerBeat, height, baseXOffset } = props
    ctx.fillStyle = "#fff";
    ctx.fillRect(
        ticksOffsetToPixels(currentMidiTick, ticksScroll, pixelsPerBeat, baseXOffset || 0),
        0,
        1,
        height
    )
}