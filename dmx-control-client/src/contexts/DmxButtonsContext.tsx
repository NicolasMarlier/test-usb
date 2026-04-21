import { createContext, useContext, useEffect, useState } from "react";

import { createDmxButton, deleteDmxButton, listDmxButtons, listPrograms, updateDmxButton } from "../ApiClient";

interface DmxButtonsContextType {
  dmxButtons: DmxButton[]
  programs: Program[]
  fetchPrograms: () => void
  program: Program | undefined
  
  selectedDmxButtonId: string | undefined
  setSelectedDmxButtonId: (id: string | undefined) => void
  
  currentProgramId: number | undefined,
  setCurrentProgramId: (programId: number | undefined) => void,
  
  syncPrograms: () => void

  createDmxButtonAndSync: () => void
  updateDmxButtonAndSync: (id: string, params: DmxButtonUpdateParams) => void,
  deleteDmxButtonAndSync: (id: string) => void
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

  const [currentProgramId, setCurrentProgramId] = useState(undefined as number | undefined)

  


  const fetchDmxButtons = () => program && listDmxButtons(program.id).then((dmxButtons) => setDmxButtons(dmxButtons))

  const syncPrograms = () => listPrograms().then(setPrograms)

  useEffect(() => {
    fetchDmxButtons()
  }, [program])

  useEffect(() => {
    setProgram(programs.find((p) => p.id == currentProgramId))
  }, [programs, currentProgramId])

  const availableTriggeringMidiKeys = () => [
    36,
    38,
    39,
    43,
    45,
    48,
  ].filter(s => !dmxButtons.map(d => d.triggering_midi_key).includes(s))[0]

  const createDmxButtonAndSync = () => {
    program && createDmxButton({
      program_id: program.id,
      color: "#ffffff",
      duration_ms: 500,
      red_channels: [1,4,7,10,13,16,19,22],
      nature: 'Boom',
      triggering_midi_key: availableTriggeringMidiKeys()
    }).then(fetchDmxButtons)
  }
  const updateDmxButtonAndSync = (id: string, params: DmxButtonUpdateParams) => {
    updateDmxButton(id, params).then(fetchDmxButtons)
  }
  const deleteDmxButtonAndSync = (id: string) => {
    deleteDmxButton(id).then(fetchDmxButtons)
  }


  useEffect(() => { syncPrograms() }, []) 

  

  const [selectedDmxButtonId, setSelectedDmxButtonId] = useState(undefined as string | undefined)  


  // pass the value in provider and return
  return (
    <DmxButtonsContext.Provider value={ {
        dmxButtons, selectedDmxButtonId, setSelectedDmxButtonId,
        program, programs, fetchPrograms: syncPrograms,

        syncPrograms,

        currentProgramId, setCurrentProgramId,

        createDmxButtonAndSync, updateDmxButtonAndSync, deleteDmxButtonAndSync,
        } }>
      {children}
    </DmxButtonsContext.Provider>
  )
}
