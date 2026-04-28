import { useEffect, useRef } from "react";
import { pixelsOffsetToMidiKeyIndex, pixelsOffsetToTicks } from "./utils";

interface Props {
    onClickTimeline: (tick: number) => void
    onClick: () => void
    ticksScroll: number
    pixelsPerBeat: number
    onSelect?: (selection: Rectangle) => void
    onSelectEnd?: () => void
    onOver: (v: {tick: number, midiKeyIndex: number}) => void
    onMoveTicksScroll?: (tick: number) => void
    onZoom?: (zoomRatio: number) => void
    registerAgain: number
}
const CanvasMouseHandler = (props: Props) => {
    const {
        ticksScroll,
        pixelsPerBeat,
        onClickTimeline,
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
            onClick()
        }
        currentSelection.current = undefined
    }

    const onMouseDown = (event: MouseEvent) => {
        if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < canvasHeight() / 5 &&
            onClickTimeline) {
            
            currentSelection.current = undefined
            onClickTimeline(
                pixelsOffsetToTicks(event.clientX - canvasLeft(), ticksScroll, pixelsPerBeat, {magnet: true, magnetMode: 'line'})
            )
            
            return
        }
        else {
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
            tick: pixelsOffsetToTicks(
                event.clientX - canvasLeft(),
                ticksScroll,
                pixelsPerBeat,
                {magnet: true}
            ),
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
            canvas().removeEventListener('mousemove', onMouseDown)
            canvas().removeEventListener('wheel', onWheel)
        }
    }, [registerAgain])

    return <></>
}

export default CanvasMouseHandler