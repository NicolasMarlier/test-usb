import './ProgramSelect.scss'

import { useEffect } from "react"
import { useDmxButtonsContext } from '../DmxButtonsContext'
import ProgramInput from './ProgramInput'

const ProgramSelect = () => {
    const { program, programs, setProgram, newProgram, editProgram, destroyProgram} = useDmxButtonsContext()
    
    useEffect(() => {
        if(program == undefined) {
            setProgram(programs[0])   
        }
    }, [programs])

    return <>
        <div>
            { programs.map((p) => {
                return <ProgramInput
                    key={p.id}
                    selected={p.id == program?.id}
                    onSelect={() => setProgram(p)}
                    program={p}
                    onUpdate={(newP) => editProgram(p.id, newP)}
                    onDelete={() => destroyProgram(p.id)}/>
            })}
            <div className='program-item' onClick={() => newProgram()}>Nouveau programme</div>
        </div>
    </>
}

export default ProgramSelect