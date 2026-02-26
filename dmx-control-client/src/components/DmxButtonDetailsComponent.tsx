import { useEffect, useState } from 'react'
import './DmxButtonDetailsComponent.scss' 
import { colorArrayToHex, colorHexToArray } from '../utils'
import { useDmxButtonsContext } from '../DmxButtonsContext'
import { DmxEffectNatures } from '../models/DmxButton'
import SignalComponent from './SignalComponent'
import type Signal from '../models/Signal'

const DmxButtonDetailsComponent = () => {
    const { updateDmxButton, selectedDmxButtonUuid, dmxButtons, lastSignal } = useDmxButtonsContext()
    const dmxButton = dmxButtons.find(({uuid}) => uuid == selectedDmxButtonUuid)
    if(!dmxButton) return <div/>

    const [nature, setNature] = useState(dmxButton.dmxButtonConfig.nature)
    const [duration, setDuration] = useState(dmxButton.dmxButtonConfig.duration)
    const [color, setColor] = useState(colorArrayToHex(dmxButton.dmxButtonConfig.color))
    const [pods, setPods] = useState(dmxButton.dmxButtonConfig.offsets.map(p => `${p.toString()},`).join(''))

    const [signalToAttach, setSignalToAttach] = useState(undefined as Signal | undefined)

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
        setNature(dmxButton.dmxButtonConfig.nature)
        setDuration(dmxButton.dmxButtonConfig.duration)
        setColor(colorArrayToHex(dmxButton.dmxButtonConfig.color))
        setPods(dmxButton.dmxButtonConfig.offsets.toSorted((a, b) => a - b).map(p => `${p.toString()},`).join(''))
    }, [dmxButton])


    useEffect(() => {
        updateDmxButton(dmxButton.uuid, {
            color: colorHexToArray(color)
        })
    }, [color])

    useEffect(() => {
        updateDmxButton(dmxButton.uuid, {
            offsets: pods.split(',').map((p) => parseInt(p, 10)).filter(n => !Number.isNaN(n))
        })
    }, [pods])

    useEffect(() => {
        updateDmxButton(dmxButton.uuid, {
            duration
        })
    }, [duration])

    useEffect(() => {
        updateDmxButton(dmxButton.uuid, {
            nature
        })
    }, [nature])

    const attachLastSignal = () => {
        updateDmxButton(dmxButton.uuid, {signal: lastSignal})
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
            <input name="color"
                value={color}
                type="color"
                onChange={(e: any) => { setColor(e.target.value) }}
                />
            { false && <div className="color-pickers">
                <div className="color-picker" onClick={() => setColor('#ffffff')} style={{background: '#ffffff'}}/>
                <div className="color-picker" onClick={() => setColor('#000000')} style={{background: '#000000'}}/>
                <div className="color-picker" onClick={() => setColor('#ff0000')} style={{background: '#ff0000'}}/>
                <div className="color-picker" onClick={() => setColor('#00ff00')} style={{background: '#00ff00'}}/>
                <div className="color-picker" onClick={() => setColor('#0000ff')} style={{background: '#0000ff'}}/>
                <div className="color-picker" onClick={() => setColor('#ff00ee')} style={{background: '#ff00ee'}}/>
            </div>}
        </div>
        <div>
            <label>Duration (ms)</label>
            <input name="duration"
                value={nature == 'Set' ? 0 : duration}
                onChange={(e: any) => { setDuration(parseInt(e.target.value, 10)) }}
                disabled={nature == 'Set'}
                />
        </div>
        <div>
            <label>Pods</label>
            <input
                value={pods}
                disabled
                onChange={(e: any) => { setPods(e.target.value) }}
                />
        </div>

        <div className="signal-container">
            { !dmxButton.dmxButtonConfig.signal && !signalToAttach && <div className="no-signal">
                <span>No signal attached</span>
            </div> }
            { !dmxButton.dmxButtonConfig.signal && !!signalToAttach && <div className="attaching-signal" onClick={attachLastSignal}>
                <span>Click to attach { signalToAttach.shortRepresentation() }</span>
            </div> }
            { dmxButton.dmxButtonConfig.signal && <SignalComponent
                signal={dmxButton.dmxButtonConfig.signal}
                onClick={() => updateDmxButton(dmxButton.uuid, {signal: undefined})}
                /> }
        </div>
    </div>
}

export default DmxButtonDetailsComponent
