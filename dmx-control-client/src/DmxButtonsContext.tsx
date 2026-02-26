import { createContext, useCallback, useContext, useEffect, useState } from "react";
import DmxButton from "./models/DmxButton";
import Signal, { MIDI_MODES } from "./models/Signal";
import { createProgram, deleteProgram, listPrograms, updateProgram, uploadMidiToProgram } from "./ApiClient";

const LOCAL_STORAGE_KEY = 'dmx-button-configs'
const initialButtons = () => loadButtonsFromStorage()

interface DmxButtonsContextType {
  dmxButtons: DmxButton[],
  programs: Program[],
  setPrograms: (programs: Program[]) => void,
  program: Program | undefined,
  setProgram: (program: Program | undefined) => void,
  selectedDmxButtonUuid: string,
  setSelectedDmxButtonUuid: (uuid: string) => void,
  updateDmxButton: (uuid: string, config: DmxButtonPartialConfig, startedAt?: number | null) => void,
  playDmxButtons: (uuids: string[]) => void
  dispatchSignals: (signals: Signal[]) => void
  lastSignal: Signal | undefined,
  newProgram: (name?: string) => void,
  editProgram: (program_id: number, program: Program) => void,
  destroyProgram: (program_id: number) => void
  addMidiToCurrentProgram: (file: File) => void
}


export const DmxButtonsContext = createContext<DmxButtonsContextType | null>(null);

export const persistButtonsToStorage = (dmxButtons: DmxButton[]) => {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(dmxButtons.map(({dmxButtonConfig}) => dmxButtonConfig))
  )
}

export const loadButtonsFromStorage = () => {
  const dmxButtonConfigs = JSON.parse(localStorage.getItem(
    LOCAL_STORAGE_KEY
  ) || "[]")
  
  if(dmxButtonConfigs.length > 0) {
    return dmxButtonConfigs.map((dmxButtonConfig: DmxButtonConfig) => DmxButton.fromConfig(dmxButtonConfig))
  }
  else {
    return Array.from(Array(12).keys()).map(() => new DmxButton())
  }
}

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
  const [dmxButtons, setDmxButtons] = useState(initialButtons())

  const [programs, setPrograms] = useState([] as Program[])
  const [program, setProgram] = useState(undefined as Program | undefined)

  const fetchPrograms = () => listPrograms().then(setPrograms)

  const newProgram = (name?: string) => {
    createProgram({name: name || 'Nouveau'}).then(() => fetchPrograms())
  }

  const editProgram = (program_id: number, newProgram: Program) => updateProgram(program_id, newProgram).then(fetchPrograms)

  const destroyProgram = (program_id: number) => deleteProgram(program_id).then(fetchPrograms)

  useEffect(() => { fetchPrograms() }, []) 

  const addMidiToCurrentProgram = useCallback((file: File) => {
    if(!program) return
    uploadMidiToProgram(program.id, file).then(fetchPrograms)
  }, [program])

  const [selectedDmxButtonUuid, setSelectedDmxButtonUuid] = useState(dmxButtons[0].uuid)
  const [lastSignal, setLastSignal] = useState(undefined as Signal | undefined)

  const updateDmxButton = (uuid: string, config: DmxButtonPartialConfig, startedAt?: number | null) => {
    setDmxButtons(dmxButtons.map((dmxButton: DmxButton) => {
      if(dmxButton.uuid == uuid) {
        return new DmxButton({...dmxButton.dmxButtonConfig, ...config}, uuid, startedAt == undefined ? dmxButton.startedAt : startedAt)
      }
      else {
        return dmxButton
      }
    }))
  }

  const dispatchSignals = useCallback((signals: Signal[]) => {
    const dmxButtonsToPlay = dmxButtons.filter((dmxButton: DmxButton) => 
      Signal.matchAnySignal(dmxButton.dmxButtonConfig.signal, signals)
    )
    setLastSignal(signals[0])
    playDmxButtons(dmxButtonsToPlay.map((dmxButton: DmxButton) => dmxButton.uuid))

    const programChangeSignal = signals.find((signal) => signal.midiMode == MIDI_MODES.PROGRAM_CHANGE)
    if(programChangeSignal) {
        console.log("program change!", (programChangeSignal?.key || 0) + 1)
        const newProgram = programs.find((p) => p.id == ((programChangeSignal?.key || 0) + 1))
        console.log(programs, newProgram)
        newProgram && setProgram(newProgram)
    }
  }, [dmxButtons, programs])

  useEffect(() => {
    persistButtonsToStorage(dmxButtons)
  }, [dmxButtons])

  const playDmxButtons = (uuids: string[]) => {
    if(uuids.length == 0) return
    console.log(uuids)
    const now = Date.now()
    setDmxButtons(dmxButtons.map((dmxButton: DmxButton) => {
      if(uuids.indexOf(dmxButton.uuid) > -1) {
        console.log("MATCH!")
        return new DmxButton(dmxButton.dmxButtonConfig, dmxButton.uuid, now)
      }
      else {
        return dmxButton
      }
    }))
    setSelectedDmxButtonUuid(uuids[0])
  }

  
  


  // pass the value in provider and return
  return (
    <DmxButtonsContext.Provider value={ {
        dmxButtons, selectedDmxButtonUuid, setSelectedDmxButtonUuid, updateDmxButton,
        playDmxButtons, dispatchSignals, lastSignal,
        program, programs, setProgram, setPrograms,
        newProgram, editProgram, destroyProgram,
        addMidiToCurrentProgram
        } }>
      {children}
    </DmxButtonsContext.Provider>
  )
}
