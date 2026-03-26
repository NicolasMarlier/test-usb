import { useDmxButtonsContext } from '../DmxButtonsContext'
import './ProgramSelectOption.scss'
import { useEffect, useState } from "react"

interface Props {
    program: Program
    isEditing: boolean
    setEditingProgramId: (id: number | undefined) => void
}
const ProgramSelectOption = (props: Props) => {
    const { updateProgramAndSync, deleteProgramAndSync, setProgram } = useDmxButtonsContext()
    const { program, isEditing, setEditingProgramId } = props

    const [name, setName] = useState(program.name)
    const [id, setId] = useState(program.id)

    useEffect(() => {
        console.log("HO")
        setName(program.name)
        setId(program.id)
    }, [program])

    const onSave = () => {
        setEditingProgramId(undefined)
        updateProgramAndSync(program.id, {id, name})
    }

    return <div
        className={`picker-option ${isEditing ? 'editing' : ''}`}>
            <input
                className='id'
                disabled={!isEditing}
                type="number"
                value={id}
                onChange={(e) => setId(parseInt(e.target.value, 10))}
                />
            <div className="separator"/>
            <input className='name'
                disabled={!isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}/>
            <div className="navigate-button" onClick={() => setProgram(program)}/>
            <div className="edit-btn btn" onClick={() => setEditingProgramId(program.id)}>Edit</div>
            <div className="delete-btn btn" onClick={() => deleteProgramAndSync(program.id)}>Delete</div>
            <div className="save-btn btn" onClick={() => onSave()}>Save</div>
            <div className="blur-on-top"/>
    </div>
}
export default ProgramSelectOption