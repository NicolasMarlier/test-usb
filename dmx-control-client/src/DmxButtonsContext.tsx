import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { createDmxButton, createProgram, deleteDmxButton, deleteProgram, listDmxButtons, listPrograms, resetProgramMidi, updateDmxButton, updateProgram, uploadMidiToProgram } from "./ApiClient";

interface DmxButtonsContextType {
  dmxButtons: DmxButton[]
  programs: Program[]
  setPrograms: (programs: Program[]) => void
  program: Program | undefined
  setProgram: (program: Program | undefined) => void
  selectedDmxButtonId: string | undefined
  setSelectedDmxButtonId: (id: string | undefined) => void
  lastSignal: string | undefined
  setLastSignal: (signal: string | undefined) => void
  
  createProgramAndSync: (name?: string) => Promise<void>
  updateProgramAndSync: (program_id: number, program: ProgramUpdateParams) => Promise<void>
  deleteProgramAndSync: (program_id: number) => Promise<void>
  uploadMidiToProgramAndSync: (file: File) => void
  resetProgramMidiAndSync: (id: number) => void

  createDmxButtonAndSync: () => void
  updateDmxButtonAndSync: (id: string, params: DmxButtonUpdateParams) => void,
  deleteDmxButtonAndSync: (id: string) => void

  midiCurrentTick: number,
  setMidiCurrentTick: (tick: number) => void
}


export const DmxButtonsContext = createContext<DmxButtonsContextType | null>(null);

export const useDmxButtonsContext = () => {
  const dmxButtonsContext = useContext(DmxButtonsContext);

  if (!dmxButtonsContext) {
    throw new Error(
      "useCurrentUser has to be used within <CurrentUserContext.Provider>"
    );
  }
  return dmxButtonsContext
}



export const DmxButtonsContextProvider = ({ children }: {children: React.ReactNode}) => {
  // Use State to keep the values
  const [dmxButtons, setDmxButtons] = useState([] as DmxButton[])

  const [programs, setPrograms] = useState([] as Program[])
  const [program, setProgram] = useState(undefined as Program | undefined)

  const [midiCurrentTick, setMidiCurrentTick] = useState(0)

  const fetchDmxButtons = () => program && listDmxButtons(program.id).then((dmxButtons) => setDmxButtons(dmxButtons))

  const fetchPrograms = () => listPrograms().then(setPrograms)

  useEffect(() => {
    fetchDmxButtons()
  }, [program])

  useEffect(() => {
    setProgram(program ? programs.find((p) => p.id == program.id) : undefined)
  }, [programs])



  const createProgramAndSync = async(name?: string) => {
    const newProgram = await createProgram({name: name || 'Nouveau'})
    await fetchPrograms()
    setProgram(programs.find(p => p.id == newProgram.id))
  }
  const updateProgramAndSync = (id: number, params: ProgramUpdateParams) => updateProgram(id, params).then(fetchPrograms)
  
  const deleteProgramAndSync = (id: number) => deleteProgram(id).then(fetchPrograms)

  const uploadMidiToProgramAndSync = useCallback((file: File) => {
    if(!program) return
    uploadMidiToProgram(program.id, file).then(fetchPrograms)
  }, [program])

  const resetProgramMidiAndSync = useCallback((id: number) => {
    resetProgramMidi(id).then(fetchPrograms)
  }, [program])



  const createDmxButtonAndSync = () => {
    program && createDmxButton({program_id: program.id}).then(fetchDmxButtons)
  }
  const updateDmxButtonAndSync = (id: string, params: DmxButtonUpdateParams) => {
    updateDmxButton(id, params).then(fetchDmxButtons)
  }
  const deleteDmxButtonAndSync = (id: string) => {
    deleteDmxButton(id).then(fetchDmxButtons)
  }


  useEffect(() => { fetchPrograms() }, []) 

  

  const [selectedDmxButtonId, setSelectedDmxButtonId] = useState(undefined as string | undefined)
  const [lastSignal, setLastSignal] = useState(undefined as string | undefined)

  
  


  // pass the value in provider and return
  return (
    <DmxButtonsContext.Provider value={ {
        dmxButtons, selectedDmxButtonId, setSelectedDmxButtonId,
        lastSignal,
        setLastSignal,
        program, programs, setProgram, setPrograms,

        createProgramAndSync, updateProgramAndSync, deleteProgramAndSync,
        uploadMidiToProgramAndSync, resetProgramMidiAndSync,

        createDmxButtonAndSync, updateDmxButtonAndSync, deleteDmxButtonAndSync,

        midiCurrentTick, setMidiCurrentTick
        } }>
      {children}
    </DmxButtonsContext.Provider>
  )
}
