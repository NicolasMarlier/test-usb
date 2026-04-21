import './ProgramSelect.scss'

import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { useEffect, useRef, useState } from 'react'
import ProgramSelectOption from './ProgramSelectOption'
import { createProgram } from '../../ApiClient'

const ProgramSelect = () => {
    const { program, programs, syncPrograms, setCurrentProgramId } = useDmxButtonsContext()

    const currentProgramId = useRef(program?.id)
    const [showPicker, setShowPicker] = useState(false)

    const [editingProgramId, setEditingProgramId] = useState(undefined as number | undefined)

    const createProgramAndSync = async(name?: string) => {
        const newProgram = await createProgram({name: name || 'Nouveau'})
        setCurrentProgramId(newProgram.id)
        syncPrograms()
    }
    const clickBackground = (e: any) => {
        if(e.target == e.currentTarget) {
            setShowPicker(false)
        }
    }
    useEffect(() => {
        if(!showPicker) {
            setEditingProgramId(undefined)
        }
    }, [showPicker])

    useEffect(() => {
        if(currentProgramId.current != program?.id) {
            currentProgramId.current = program?.id
            setShowPicker(false)
        }
    }, [program])
    return <>
            { program && <div
                className="current-program"
                onClick={() => setShowPicker(true)}>{program.id} | {program.name}
            </div> }
            { !program && <div
                className="current-program  "
                onClick={() => setShowPicker(true)}>
                Pick a program
            </div>}

            { showPicker && <div className="picker-background" onClick={clickBackground}>
                <div className={`picker ${editingProgramId ? 'editing' : 'not-editing'}`}>
                { programs.map((p) => <ProgramSelectOption
                    key={p.id}
                    program={p}
                    isEditing={editingProgramId == p.id}
                    setEditingProgramId={setEditingProgramId}/>)}        
                <div className='picker-option new-program' onClick={() => createProgramAndSync()}>Nouveau programme</div>
                
                </div>
                <div className='picker-bottom-shadow'/>
            </div>}
    </>
}

export default ProgramSelect