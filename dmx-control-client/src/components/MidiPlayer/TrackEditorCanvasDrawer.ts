import { drawBeatsGrid, drawTimeline, drawCurrentTick, type DrawerFunctionProps, drawCurrentSelection, SELECTED_COLOR, ITEM_COLOR, drawRoundedRect } from "./GenericCanvasDrawer";
import { midiKeyToPixelsHeight, midiKeyToPixelsOffset, midiPatternToRectangle, setupCanvasDPR, ticksDurationToPixels, ticksOffsetToPixels } from "./utils";

interface Props {
    canvas: HTMLCanvasElement
    midiPatterns: MidiPattern[]
    ticksScroll: number
    pixelsPerBeat: number
    audioWaveData: Uint8Array
    ppq: number
    allMidiKeys: MidiKey[]
    selectedMidiPatterns: MidiPattern[]
    currentMidiTick: number
    aimedMidiNote: MidiNote | null
    mouseSelection: Rectangle | null
}


const drawAudioWave = (props: DrawerFunctionProps, audioWaveData: Uint8Array) => {
    const { ctx, ticksScroll, pixelsPerBeat, width, height } = props

    ctx.fillStyle = "#000000aa";
    ctx.beginPath();
    ctx.roundRect(
        0,
        3 * height / 5,
        width,
        2 * height / 5,
        4
    )
    ctx.fill();
    
    ctx.fillStyle = "#ffffff06";
    audioWaveData.forEach((dataPoint, ticks) => {
        const dataPointHeight = dataPoint * height * 2 / (255 * 5)
        ctx.fillRect(
            ticksOffsetToPixels(ticks, ticksScroll, pixelsPerBeat),
            height * 4 / 5 - dataPointHeight / 2,
            1,
            dataPointHeight
        )
    })
}

const drawMidiPattern = (props: DrawerFunctionProps, params: {midiPattern: MidiPattern, currentMidiTick: number}) => {
    const { ctx,  height, ticksScroll, pixelsPerBeat, allMidiKeys } = props
    const { midiPattern, currentMidiTick } = params
    const rect = midiPatternToRectangle(
        midiPattern,
        height,
        ticksScroll,
        pixelsPerBeat
    )
    drawRoundedRect(ctx, rect)
    midiPattern.midi_notes.forEach((midiNote) => {
        ctx.fillStyle = "#00000055";
        
        // Highlight when played
        if(currentMidiTick >= midiNote.ticks && currentMidiTick < midiNote.ticks + midiNote.durationTicks) {
            ctx.fillStyle = "#ffffffcc";
        }

        ctx.fillRect(
            ticksOffsetToPixels(midiNote.ticks, ticksScroll, pixelsPerBeat) + 1,
            midiKeyToPixelsOffset(midiNote.midi, height, allMidiKeys),
            ticksDurationToPixels(midiNote.durationTicks, pixelsPerBeat) - 1,
            midiKeyToPixelsHeight(height)
        )
    })
}

const drawMidiPatterns = (props: DrawerFunctionProps, params: {midiPatterns: MidiPattern[], selectedMidiPatterns: MidiPattern[], currentMidiTick: number}) => {
    const { ctx } = props
    const { midiPatterns, selectedMidiPatterns, currentMidiTick } = params
    midiPatterns.forEach((midiPattern) => {
            const isSelected = selectedMidiPatterns.find((n) => n.ticks == midiPattern.ticks)
            ctx.fillStyle = isSelected ? SELECTED_COLOR : ITEM_COLOR
            
            drawMidiPattern(props, {midiPattern, currentMidiTick})
            
            if(midiPattern.loop_until_tick) {
                for(let i = midiPattern.ticks + midiPattern.durationTicks; i < midiPattern.loop_until_tick; i += midiPattern.durationTicks) {
                    const loopedPattern = {
                        ticks: i,
                        durationTicks: Math.min(midiPattern.durationTicks, midiPattern.loop_until_tick - i),
                        midi_notes: midiPattern.midi_notes.map(n => ({...n, ...{ticks: n.ticks + i - midiPattern.ticks}}))
                    }
                    ctx.fillStyle = isSelected ? SELECTED_COLOR + "33" : ITEM_COLOR + "33"
                    drawMidiPattern(props, {midiPattern: loopedPattern, currentMidiTick})
                }
            }
        })
}



const drawAimedMidiNote = (props: DrawerFunctionProps, aimedMidiNote: MidiNote) => {
    const { ctx,  height, ticksScroll, pixelsPerBeat, allMidiKeys } = props
    ctx.fillStyle = "#ffffff11";
        ctx.fillRect(
        ticksOffsetToPixels(aimedMidiNote.ticks, ticksScroll, pixelsPerBeat) + 1,
        midiKeyToPixelsOffset(aimedMidiNote.midi, height, allMidiKeys),
        ticksDurationToPixels(aimedMidiNote.durationTicks, pixelsPerBeat) - 1,
        midiKeyToPixelsHeight(height)
    )
}


export const redrawFullCanvas = (props: Props) => {
        const {
            canvas,
            midiPatterns,
            audioWaveData,
            aimedMidiNote,
            selectedMidiPatterns,
            currentMidiTick,
            mouseSelection
        } = props

        const ctx = canvas.getContext("2d")
        if(!ctx) return

        const { width, height } = setupCanvasDPR(canvas, ctx, -2)

        const drawerFunctionProps: DrawerFunctionProps = {
            ...props,
            ...{
                width,
                height,
                ctx,
                baseYOffset: height/5
            }
        }
        
        // Background
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height/5)
        drawBeatsGrid(drawerFunctionProps)

        // Top part
        drawTimeline(drawerFunctionProps)
        
        // Middle part
        
        drawMidiPatterns(drawerFunctionProps, {midiPatterns, selectedMidiPatterns, currentMidiTick})
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