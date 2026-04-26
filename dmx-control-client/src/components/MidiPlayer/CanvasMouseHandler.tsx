import { useEffect, useRef } from "react";
import { pixelsOffsetToMidiKeyIndex, pixelsOffsetToTicks } from "./utils";

interface Props {
    onClickTimeline: (tick: number) => void
    onClick: () => void
    ticksScroll: number
    registerAgain: number
    onSelect?: (selection: Rectangle) => void
    onSelectEnd?: () => void
    onOver: (v: {tick: number, midiKeyIndex: number}) => void
}
const CanvasMouseHandler = (props: Props) => {
    const {
        ticksScroll,
        onClickTimeline,
        onClick,
        onSelect,
        onSelectEnd,
        onOver,
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
        if(!didMouseMovedWhileDown()) {
            onClickGeneric(event)
        }
        currentSelection.current = undefined
    }

    const onClickGeneric = (event: MouseEvent) => {
        // When in first fifth, click timeline
        if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < canvasHeight() / 5 &&
            onClickTimeline) {
            onClickTimeline(
                pixelsOffsetToTicks(event.clientX - canvasLeft(), ticksScroll, {magnet: true, magnetMode: 'line'})
            )
            return
        }
        else {
            onClick()
        }
    }

    const onMouseDown = (event: MouseEvent) => {
        currentSelection.current = {
            x0: event.clientX - canvasLeft(),
            y0: event.clientY - canvasTop(),
            x1: event.clientX - canvasLeft(),
            y1: event.clientY - canvasTop(),
        }
    }

    const onMouseDownMove = (event: MouseEvent) => {
        if(didMouseMovedWhileDown()) {
            if(onOver) onOver({tick: 0, midiKeyIndex: -1})
        }

        currentSelection.current = {
            x0: currentSelection.current?.x0 || event.clientX - canvasLeft(),
            y0: currentSelection.current?.y0 || event.clientY - canvasTop(),
            x1: event.clientX - canvasLeft(),
            y1: event.clientY - canvasTop(),
        }
        if(onSelect) onSelect(currentSelection.current)
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
                {magnet: true}
            ),
            midiKeyIndex: pixelsOffsetToMidiKeyIndex(
                event.clientY - canvasTop(),
                canvasHeight()
            )
        })
    }
    

    useEffect(() => {
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mousemove', onMouseMove)
        canvas().addEventListener('mousedown', onMouseDown)
        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousemove", onMouseMove);
            canvas().removeEventListener('mousemove', onMouseDown)
        }
    }, [registerAgain])

    return <></>
}

export default CanvasMouseHandler