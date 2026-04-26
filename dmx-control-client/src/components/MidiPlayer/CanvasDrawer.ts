import { midiKeyToPixelsHeight, midiKeyToPixelsOffset, midiNoteToRectangle, ticksDurationToPixels, ticksOffsetToPixels } from "./utils";

interface Props {
    canvas: HTMLCanvasElement
    midiNotes: MidiNote[]
    ticksScroll: number
    audioWaveData: Uint8Array
    ppq: number
    allMidiKeys: MidiKey[]
    selectedMidiNotes: MidiNote[]
    currentMidiTick: number
    aimedMidiNote: MidiNote | null
    mouseSelection: Rectangle | null
}

interface DrawerFunctionProps {
    canvas: HTMLCanvasElement,
    width: number
    height: number
    ctx: CanvasRenderingContext2D
    ticksScroll: number
    ppq: number
    allMidiKeys: MidiKey[]
}

const adjustDevicePixelRatio = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight - 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
}

const drawAudioWave = (props: DrawerFunctionProps, audioWaveData: Uint8Array) => {
    const { ctx, ticksScroll, height } = props
    ctx.fillStyle = "#ffffff06";
    audioWaveData.forEach((dataPoint, ticks) => {
        const dataPointHeight = dataPoint * height * 2 / (255 * 5)
        ctx.fillRect(
            ticksOffsetToPixels(ticks, ticksScroll),
            height * 4 / 5 - dataPointHeight / 2,
            1,
            dataPointHeight
        )
    })
}

const drawBeatsGrid = (props: DrawerFunctionProps) => {
    const { ctx, ppq, height, ticksScroll } = props
    for(let tick=0; tick <= ppq * 60 * 10; tick+= 1) {
        if(tick % ppq == 0) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(
                ticksOffsetToPixels(tick, ticksScroll),
                0,
                1,
                height
            )
        }
        else if(tick % (ppq / 4) == 0) {
            ctx.fillStyle = "#00000044";
            ctx.fillRect(
                ticksOffsetToPixels(tick, ticksScroll),
                0,
                1,
                height
            )
        }
    }
}

const drawMidiKeysGrid = (props: DrawerFunctionProps) => {
    const { allMidiKeys, ctx,  width, height } = props
    allMidiKeys.forEach(midiKey => {
        ctx.fillStyle = "#00000022"
        ctx.fillRect(
            0,
            midiKeyToPixelsOffset(midiKey, height, allMidiKeys),
            width,
            1
        )
        ctx.fillRect(
            0,
            midiKeyToPixelsOffset(midiKey, height, allMidiKeys) +
            midiKeyToPixelsHeight(height),
            width,
            1
        )
    })
}

const drawBeatsNumbers = (props: DrawerFunctionProps) => {
    const { ctx, ppq, ticksScroll, height, width } = props
    ctx.fillStyle = "#222222";
    ctx.fillRect(
        Math.max(0, ticksOffsetToPixels(0, ticksScroll)),
        height / 5,
        width,
        2 * height / 5
    )
    
    ctx.font = "14px Tahoma";
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff66";
    for(let tick=0; tick <= ppq * 60 * 10; tick+= 1) {
        if(tick % ppq == 0) {
            ctx.fillText(`${tick / ppq}`, ticksOffsetToPixels(tick, ticksScroll) + 5, 10);
        }
    }
}

const drawMidiNotes = (props: DrawerFunctionProps, params: {midiNotes: MidiNote[], selectedMidiNotes: MidiNote[], currentMidiTick: number}) => {
    const { ctx,  height, ticksScroll, allMidiKeys } = props
    const { midiNotes, selectedMidiNotes, currentMidiTick } = params
    midiNotes.forEach((midiNote) => {
            ctx.fillStyle = "#ffffffaa";
            
            // Highlight when played
            if(selectedMidiNotes.find((n) => midiNote.midi == n.midi && midiNote.ticks == n.ticks)) {
                ctx.fillStyle = "#72cb3faa";
            }
            else if(currentMidiTick >= midiNote.ticks && currentMidiTick < midiNote.ticks + midiNote.durationTicks) {
                ctx.fillStyle = "#ffffffcc";
            }

            ctx.fillRect(
                ticksOffsetToPixels(midiNote.ticks, ticksScroll) + 1,
                midiKeyToPixelsOffset(midiNote.midi, height, allMidiKeys),
                ticksDurationToPixels(midiNote.durationTicks) - 1,
                midiKeyToPixelsHeight(height)
            )
        })
}

const drawAimedMidiNote = (props: DrawerFunctionProps, aimedMidiNote: MidiNote) => {
    const { ctx,  height, ticksScroll, allMidiKeys } = props
    ctx.fillStyle = "#ffffff11";
        ctx.fillRect(
        ticksOffsetToPixels(aimedMidiNote.ticks, ticksScroll) + 1,
        midiKeyToPixelsOffset(aimedMidiNote.midi, height, allMidiKeys),
        ticksDurationToPixels(aimedMidiNote.durationTicks) - 1,
        midiKeyToPixelsHeight(height)
    )
}

const drawCurrentTick = (props: DrawerFunctionProps, currentMidiTick: number) => {
    const { ctx, ticksScroll, height } = props
    ctx.fillStyle = "#fff";
    ctx.fillRect(
        ticksOffsetToPixels(currentMidiTick, ticksScroll),
        0,
        1,
        height
    )
}

const drawCurrentSelection = (props: DrawerFunctionProps, mouseSelection: Rectangle) => {
    const { ctx } = props
    ctx.strokeStyle = "#ffffff88";
    ctx.strokeRect(
        mouseSelection.x0,
        mouseSelection.y0,
        mouseSelection.x1 - mouseSelection.x0,
        mouseSelection.y1 - mouseSelection.y0,
    )
}


export const redrawFullCanvas = (props: Props) => {
        const {
            canvas,
            midiNotes,
            audioWaveData,
            aimedMidiNote,
            selectedMidiNotes,
            currentMidiTick,
            mouseSelection
        } = props

        const ctx = canvas.getContext("2d")
        if(!ctx) return

        adjustDevicePixelRatio(canvas, ctx)

        const width = canvas.clientWidth;
        const height = canvas.clientHeight - 2;

        const drawerFunctionProps: DrawerFunctionProps = {
            ...props,
            ...{
                width,
                height,
                ctx
            }
        }
        
        // Background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height)

        // Top part
        drawBeatsNumbers(drawerFunctionProps)
        
        // Middle part
        drawBeatsGrid(drawerFunctionProps)
        drawMidiKeysGrid(drawerFunctionProps)
        drawMidiNotes(drawerFunctionProps, {midiNotes, selectedMidiNotes, currentMidiTick})
        if(aimedMidiNote) {
            drawAimedMidiNote(drawerFunctionProps, aimedMidiNote)
        }

        // Bottom part
        drawAudioWave(drawerFunctionProps, audioWaveData)

        // Overlay
        drawCurrentTick(drawerFunctionProps, currentMidiTick)
        if(mouseSelection) {
            drawCurrentSelection(drawerFunctionProps, mouseSelection)
        }
    }