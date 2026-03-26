import { useEffect, useState } from 'react'
import './DmxButtonDetailsComponent.scss' 
import { useDmxButtonsContext } from '../DmxButtonsContext'
import { DmxEffectNatures } from '../models/OldDmxButton'
import { humanizeSignal } from '../utils'

interface Props {
    dmxButton: DmxButton
}

const DmxButtonDetailsComponent = ({dmxButton}: Props) => {
    const { updateDmxButtonAndSync, deleteDmxButtonAndSync, lastSignal } = useDmxButtonsContext()


    const [nature, setNature] = useState(dmxButton.nature)
    const [durationMs, setDurationMs] = useState(dmxButton.duration_ms)
    const [color, setColor] = useState(dmxButton.color)
    const [pods, setPods] = useState(dmxButton.offsets.map(p => `${p.toString()},`).join(''))

    const [signalToAttach, setSignalToAttach] = useState(undefined as string | undefined)

    useEffect(() => {
        setSignalToAttach(lastSignal)
        if(!!lastSignal) {
            let intervalId = setTimeout(() => {
                setSignalToAttach(undefined)
            }, 1000)
            return () => clearInterval(intervalId);
        }
    }, [lastSignal])

    

    useEffect(() => {
        setNature(dmxButton.nature)
        setDurationMs(dmxButton.duration_ms)
        setColor(dmxButton.color)
        setPods(dmxButton.offsets.toSorted((a, b) => a - b).map(p => `${p.toString()},`).join(''))
    }, [dmxButton])


    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, {color})
    }, [color])

    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, {
            offsets: pods.split(',').map((p) => parseInt(p, 10)).filter(n => !Number.isNaN(n))
        })
    }, [pods])

    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, { duration_ms: durationMs })
    }, [durationMs])

    useEffect(() => {
        updateDmxButtonAndSync(dmxButton.id, { nature })
    }, [nature])

    const attachLastSignal = () => {
        updateDmxButtonAndSync(dmxButton.id, {signal: (lastSignal || ('')).split('|').slice(0, 2).join('|') })
    }

    return <div className="dmx-detailled-button">
        <div>
            <label>Function</label>
            <select value={nature} onChange={(e) => {
                const newNature = (DmxEffectNatures.find(n => n == e.target.value) || 'Set') as DmxEffectNature
                setNature(newNature)
            }}>
                { DmxEffectNatures.map((nature) => (
                    <option key={nature}>{ nature }</option>
                ))}
            </select>
        </div>
        <div>
            <label>Color</label>
            <label className="color" style={{background: color}}>
                <input name="color"
                    value={color}
                    type="color"
                    onChange={(e: any) => { setColor(e.target.value) }}
                    />
            </label>
        </div>
        <div>
            <label>Duration (ms)</label>
            <input name="durationMs"
                value={durationMs}
                onChange={(e: any) => { setDurationMs(parseInt(e.target.value, 10)) }}
                />
        </div>

        <div className="">
            <label>Signal</label>
            { !dmxButton.signal && !signalToAttach && <input
                value={'No signal'}
                disabled
                /> }
            { !dmxButton.signal && !!signalToAttach && <div className="attaching-signal" onClick={attachLastSignal}>
                <span>Attach {humanizeSignal(signalToAttach)} </span>
            </div> }
            { dmxButton.signal && <input
                value={humanizeSignal(dmxButton.signal)}
                disabled
                onClick={() => updateDmxButtonAndSync(dmxButton.id, {signal: ""})}
                /> }
        </div>

        <div className="delete-btn btn" onClick={() => deleteDmxButtonAndSync(dmxButton.id)}>DELETE</div>
    </div>
}

export default DmxButtonDetailsComponent
