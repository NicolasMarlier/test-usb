import { useEffect, useRef, useState } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { PauseIcon, PlayIcon, StopIcon } from "../DesignSystem/Icons"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { getProgramAudio } from "../../ApiClient"
import { tickToTime, timeToTick } from "./utils"
import { useRealTimeContext } from "../../contexts/RealTimeContext"

const AudioPlayer = () => {
    const { program } = useDmxButtonsContext()
    const { midiCurrentTickRef, sendCurrentTickToServer } = useRealTimeContext()
    const [isPlaying, setIsPlaying] = useState(false)

    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    const fetchAudioUrl = () => {
        if(program?.id) {
            getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))
        }
        else {
            setAudioUrl(undefined)
        }
    }


    useEffect(fetchAudioUrl, [program])

    const audioRef = useRef<HTMLAudioElement>(null)

    const pause = () => {
        if(!audioRef.current) return 
        audioRef.current.pause()
        setIsPlaying(false)
    }

    const play = () => {
        if(!audioRef.current) return

        if(program) {
            audioRef.current.currentTime = tickToTime(midiCurrentTickRef.current, program.bpm)
        }
        audioRef.current.play()
        setIsPlaying(true)
    }


    const onRewindButton = () => {
        if(!audioRef.current) return 
        audioRef.current.currentTime = 0
        sendCurrentTickToServer(0)
    }

    useEffect(() => {
        if(isPlaying && program) {
            const audioInterval = setInterval(() => {
                if(audioRef.current) {
                    sendCurrentTickToServer(timeToTick(audioRef.current.currentTime, program.bpm))
                }
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [isPlaying])

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
            onClick={() => {(isPlaying ? pause : play)() }}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            onClick={onRewindButton}
            disabled={isPlaying}>
            <StopIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer