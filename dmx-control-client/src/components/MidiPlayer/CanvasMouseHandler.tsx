import { useEffect, type RefObject } from "react";
import { xToTicks } from "./utils";
import { useDmxMidiContext } from "../../contexts/DmxMidiContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";

interface Props<T> {
    canvasRef: RefObject<HTMLCanvasElement | null>
    ticksScrollRef: RefObject<number>
    pixelsPerBeatRef: RefObject<number>
    selectionRef: RefObject<MouseSelection | null>
    onSelectedItemsChange?: () => void
    timelineHeight: number,
    selectedItemsRef: RefObject<T[]>,
    itemsInRect: (rect: Rectangle) => T[],
    transformItem: (item: T, x: number, y: number) => T,
    updateSelectedItems: (items: T[]) => void
    itemFromXY: (x: number, y: number) => T | undefined,
    ghostItemRef: RefObject<T | undefined>,
    isItemInSelection?: (item: T, selectedItems: T[]) => boolean,
    x0?: number
}

const CanvasMouseHandler = <T,>(props: Props<T>) => {
    const {
        canvasRef,
        ticksScrollRef,
        pixelsPerBeatRef,
        selectionRef,
        timelineHeight,
        selectedItemsRef,
        onSelectedItemsChange,
        itemsInRect,
        transformItem,
        updateSelectedItems,
        itemFromXY,
        ghostItemRef,
        isItemInSelection = (item: T, selected: T[]) => selected.includes(item),
        x0 = 0
    } = props

    const { setActiveEditor } = useDmxMidiContext()
    const { sendCurrentTickToServer } = useRealTimeContext()

    const canvasTop = () => canvasRef.current?.getBoundingClientRect().top || 0
    const canvasLeft = () => canvasRef.current?.getBoundingClientRect().left || 0
    
    const didMouseMovedWhileDown = () => (
        selectionRef.current && (
                Math.abs(selectionRef.current.rect.x1 - selectionRef.current.rect.x0) >= 2 ||
                Math.abs(selectionRef.current.rect.y1 - selectionRef.current.rect.y0) >= 2
        )
    )


    const onMouseUp = (_event: MouseEvent) => {
        if(!didMouseMovedWhileDown()) {
            selectionRef.current = null
            return
        }

        if(selectionRef.current?.mode == 'drag') {
            const deltaX = selectionRef.current.rect.x1 - selectionRef.current.rect.x0
            const deltaY = selectionRef.current.rect.y1 - selectionRef.current.rect.y0
            updateSelectedItems(
                selectedItemsRef.current.map(i => transformItem(i, deltaX, deltaY))
            )
        }
        else if(ghostItemRef.current) {
            updateSelectedItems([ghostItemRef.current])
        }
        selectionRef.current = null
        
    }

    const magnetXToTicks = (x: number) => xToTicks({
        x,
        ticksScroll: ticksScrollRef.current,
        pixelsPerBeat: pixelsPerBeatRef.current,
        magnet: true,
        magnetMode: 'line',
        x0,
    })

    const setSelectedItems = (items: T[]) => {
        selectedItemsRef.current = items
        if(onSelectedItemsChange) onSelectedItemsChange()
    }

    const onMouseDown = (event: MouseEvent) => {
        setActiveEditor('TrackEditor')

        if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < timelineHeight) {
            
            selectionRef.current = null
            sendCurrentTickToServer(magnetXToTicks(event.clientX - canvasLeft()))
        }
        else if(event.clientY - canvasTop() > timelineHeight) {
            const x = event.clientX - canvasLeft()
            const y = event.clientY - canvasTop()
            const items = itemsInRect({x0:x, y0:y, x1: x, y1: y})

            if(items.length == 0) {
                setSelectedItems([])
                selectionRef.current = {
                    mode: 'select',
                    rect: {
                        x0: event.clientX - canvasLeft(),
                        y0: event.clientY - canvasTop(),
                        x1: event.clientX - canvasLeft(),
                        y1: event.clientY - canvasTop(),
                    }
                }
            }
            else {
                const clickedItemAlreadySelected = items.some(item => isItemInSelection(item, selectedItemsRef.current))
                if(event.shiftKey) {
                    setSelectedItems([...selectedItemsRef.current, ...items])
                }
                else if(!clickedItemAlreadySelected) {
                    setSelectedItems(items)
                }
                selectionRef.current = {
                    mode: 'drag',
                    rect: {
                        x0: event.clientX - canvasLeft(),
                        y0: event.clientY - canvasTop(),
                        x1: event.clientX - canvasLeft(),
                        y1: event.clientY - canvasTop(),
                    }
                }
            }            
        }
    }

    const onMouseDownMove = (event: MouseEvent) => {
        ghostItemRef.current = undefined

        if(selectionRef.current) {
            selectionRef.current = {
                mode: selectionRef.current.mode,
                rect: {
                    x0: selectionRef.current.rect.x0,
                    y0: selectionRef.current.rect.y0,
                    x1: event.clientX - canvasLeft(),
                    y1: event.clientY - canvasTop(),
                }
            }
            if(selectionRef.current.mode == 'select') {
                setSelectedItems(itemsInRect(selectionRef.current.rect))
            }
        }
    }

    const onMouseMove = (event: MouseEvent) => (
        !selectionRef.current ? onMouseUpMove : onMouseDownMove
    )(event)

    const onMouseUpMove = (event: MouseEvent) => {
        if(itemsInRect({
            x0: event.clientX - canvasLeft(),
            y0: event.clientY - canvasTop(),
            x1: event.clientX - canvasLeft(),
            y1: event.clientY - canvasTop()
        }).length > 0) {
            ghostItemRef.current = undefined
        }
        else {
            ghostItemRef.current = itemFromXY(
                event.clientX - canvasLeft(),
                event.clientY - canvasTop()
            )
        }
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        setActiveEditor('TrackEditor')
        
        if(Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX != 0) {
            const scrollAmount = (e.deltaX) * 1000
            ticksScrollRef.current = Math.max(0, ticksScrollRef.current + scrollAmount / pixelsPerBeatRef.current)
        }
        else if(e.deltaY != 0) {
            const zoomRatio = 1 + (e.deltaY) * 0.01
            pixelsPerBeatRef.current =  Math.min(Math.max(2, pixelsPerBeatRef.current*zoomRatio), 200)
        }
    }
    

    useEffect(() => {
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mousemove', onMouseMove)
        canvasRef.current?.addEventListener('mousedown', onMouseDown)
        canvasRef.current?.addEventListener('wheel', onWheel, {passive: false})
        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousemove", onMouseMove);
            canvasRef.current?.removeEventListener('mousedown', onMouseDown)
            canvasRef.current?.removeEventListener('wheel', onWheel)
        }
    }, [])

    return <></>
}

export default CanvasMouseHandler