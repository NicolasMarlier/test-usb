import { useEffect, useRef, type RefObject } from "react";
import { pixelsOffsetToMidiKeyIndex, xToTicks } from "./utils";

interface Props {
    onClickTimeline: (tick: number) => void
    onClickMain: (tick: number) => void
    onClickAudioWave: (tick: number) => void
    onClick?: () => void
    ticksScrollRef: RefObject<number>
    pixelsPerBeatRef: RefObject<number>
    onSelect?: (selection: Rectangle) => void
    onSelectEnd?: () => void
    onOver?: (v: {tick: number, midiKeyIndex: number}) => void
    onMoveTicksScroll?: (tick: number) => void
    onZoom?: (zoomRatio: number) => void
    registerAgain: number
}
const CanvasMouseHandler = (props: Props) => {
    const {
        ticksScrollRef,
        pixelsPerBeatRef,
        onClickTimeline,
        onClickMain,
        onClickAudioWave,
        onClick,
        onSelect,
        onSelectEnd,
        onOver,
        onMoveTicksScroll,
        onZoom,
        registerAgain
    } = props

    const canvas = () => (
        document.getElementById("midi-canvas") as HTMLCanvasElement
    )

    const canvasTop = () => canvas().getBoundingClientRect().top
    const canvasHeight = () => canvas().getBoundingClientRect().height
    const canvasLeft = () => canvas().getBoundingClientRect().left

    const currentSelection = useRef<Rectangle | undefined>(undefined)
    
    const didMouseMovedWhileDown = () => (
        currentSelection.current && (
                Math.abs(currentSelection.current.x1 - currentSelection.current.x0) >= 2 ||
                Math.abs(currentSelection.current.y1 - currentSelection.current.y0) >= 2
        )
    )


    const onMouseUp = (event: MouseEvent) => {
        if(onSelectEnd) onSelectEnd()
        if(currentSelection.current && !didMouseMovedWhileDown()) {
            if(onClick) onClick()
        }
        currentSelection.current = undefined
    }

    const rawXToTicks = (x: number) => xToTicks({
        x,
        ticksScroll: ticksScrollRef.current,
        pixelsPerBeat: pixelsPerBeatRef.current,
        magnet: true,
        magnetMode: 'line'
    })

    const onMouseDown = (event: MouseEvent) => {
        if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < canvasHeight() / 5 &&
            onClickTimeline) {
            
            currentSelection.current = undefined
            onClickTimeline(rawXToTicks(event.clientX - canvasLeft()))
            
            return
        }
        else if(event.clientY - canvasTop() > canvasHeight() / 5 &&
            event.clientY - canvasTop() < 3 * canvasHeight() / 5) {
            currentSelection.current = undefined
            onClickMain(rawXToTicks(event.clientX - canvasLeft()))
        } 
        else {
            onClickAudioWave(rawXToTicks(event.clientX - canvasLeft()))
            currentSelection.current = {
                x0: event.clientX - canvasLeft(),
                y0: event.clientY - canvasTop(),
                x1: event.clientX - canvasLeft(),
                y1: event.clientY - canvasTop(),
            }
        }
    }

    const onMouseDownMove = (event: MouseEvent) => {
        if(didMouseMovedWhileDown()) {
            if(onOver) onOver({tick: 0, midiKeyIndex: -1})
        }

        if(currentSelection.current) {
            currentSelection.current = {
                x0: currentSelection.current.x0,
                y0: currentSelection.current.y0,
                x1: event.clientX - canvasLeft(),
                y1: event.clientY - canvasTop(),
            }
            if(onSelect) onSelect(currentSelection.current)
        }
        
    }

    const onMouseMove = (event: MouseEvent) => (
        currentSelection.current ? onMouseDownMove : onMouseUpMove
    )(event)

    const onMouseUpMove = (event: MouseEvent) => {
        if(!onOver) return

        onOver({
            tick: xToTicks({
                x: event.clientX - canvasLeft(),
                ticksScroll: ticksScrollRef.current,
                pixelsPerBeat: pixelsPerBeatRef.current,
                magnet: true
            }),
            midiKeyIndex: pixelsOffsetToMidiKeyIndex(
                event.clientY - canvasTop(),
                canvasHeight()
            )
        })
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        
        if(onMoveTicksScroll && Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX != 0) {
            onMoveTicksScroll((e.deltaX) * 10)
        }
        else if(onZoom && e.deltaY != 0) onZoom(1 + (e.deltaY) * 0.01)
    }
    

    useEffect(() => {
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mousemove', onMouseMove)
        canvas().addEventListener('mousedown', onMouseDown)
        canvas().addEventListener('wheel', onWheel, {passive: false})
        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousemove", onMouseMove);
            canvas().removeEventListener('mousedown', onMouseDown)
            canvas().removeEventListener('wheel', onWheel)
        }
    }, [registerAgain])

    return <></>
}

export default CanvasMouseHandler