import { useEffect, useRef } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { PauseIcon, PlayIcon, StopIcon } from "./Icons"

interface Props {
    disabled: boolean
    audioUrl: string | undefined
    isPlaying: boolean
    onCurrentTimeUpdate: (currentTime: number) => void
    setIsPlaying: (isPlaying: boolean) => void
    currentTime: number
}

const AudioPlayer = (props: Props) => {
    const { disabled, audioUrl, isPlaying, setIsPlaying, onCurrentTimeUpdate, currentTime } = props

    const audioRef = useRef<HTMLAudioElement>(null)

    const pause = () => {
        if(!audioRef.current) return 
        audioRef.current.pause()
        setIsPlaying(false)
    }

    const play = () => {
        if(!audioRef.current) return 
        audioRef.current.play()
        setIsPlaying(true)
    }


    const onRewindButton = () => {
        if(!audioRef.current) return 
        audioRef.current.currentTime = 0
        onCurrentTimeUpdate(0)
    }

    useEffect(() => {
        if(isPlaying) {
            const audioInterval = setInterval(() => {
                if(audioRef.current) {
                    onCurrentTimeUpdate(audioRef.current.currentTime)
                }
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [isPlaying, onCurrentTimeUpdate])

    useEffect(() => {
        if(!audioRef.current) return
        if(!currentTime) return
        audioRef.current.currentTime = currentTime
    }, [currentTime])

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key == ' ') (isPlaying ? pause : play)()
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [isPlaying])

    return <>
        <audio
            ref={audioRef}
            src={audioUrl}/>
        <SmallButton
            value={isPlaying}
            onClick={() => {(isPlaying ? pause : play)() }}
                disabled={disabled}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            onClick={onRewindButton}
            disabled={disabled || isPlaying}>
            <StopIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer