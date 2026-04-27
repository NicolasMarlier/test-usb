import axios from "axios"

const BASE_PATH = 'http://localhost:3000'

export const listPrograms: () => Promise<Program[]> = () => axios
  .get(`${BASE_PATH}/programs`)
  .then((response) => response.data)

export const createProgram: (dict: {name: string}) => Promise<Program> = ({name}) => axios
  .post(`${BASE_PATH}/programs`, {name})
  .then((response) => response.data)

export const updateProgram: (id: number, program: ProgramUpdateParams) => Promise<void> = (id, program) => axios
  .put(`${BASE_PATH}/programs/${id}`, program)

export const selectProgram: (id: number) => Promise<void> = (id) => axios
  .put(`${BASE_PATH}/programs/${id}/select`)

export const deleteProgram: (id: number) => Promise<void> = (id) => axios
  .delete(`${BASE_PATH}/programs/${id}`)
  

export const getProgramDmxMidi: (program_id: number) => Promise<DmxMidi> = (program_id) => axios
  .get(`${BASE_PATH}/programs/${program_id}/dmx_midi`)
  .then((response) => response.data)

export const updateProgramDmxMidi: (program_id: number, params: DmxMidiUpdateParams) => Promise<DmxMidi> = (program_id, params) => axios
  .put(`${BASE_PATH}/programs/${program_id}/dmx_midi`, params)
  .then((response) => response.data)


export const listDmxButtons: (program_id: number) => Promise<DmxButton[]> = (program_id) => axios
  .get(`${BASE_PATH}/dmx_buttons`, {params: {program_id}})
  .then((response) => response.data)

export const createDmxButton: (params: DmxButtonCreationParams) => Promise<void> = (params) => axios
  .post(`${BASE_PATH}/dmx_buttons`, params)

export const updateDmxButton: (id: string, params: DmxButtonUpdateParams) => Promise<void> = (id, params) => axios
  .put(`${BASE_PATH}/dmx_buttons/${id}`, params)

export const playDmxButton: (id: string) => Promise<void> = (id) => axios
  .post(`${BASE_PATH}/dmx_buttons/${id}/play`, {})

export const deleteDmxButton: (id: string) => Promise<void> = (id) => axios
  .delete(`${BASE_PATH}/dmx_buttons/${id}`)

export const uploadProgramAudio: (program_id: number, file: File) => Promise<void> = (program_id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axios.post(`${BASE_PATH}/programs/${program_id}/audio`, formData)
}

export const getProgramAudio: (program_id: number) => Promise<string | null> = async (program_id) => {
  try {
    const response = await axios.get(`${BASE_PATH}/programs/${program_id}/audio`, { responseType: 'blob' })
    return URL.createObjectURL(response.data)
  } catch {
    return null
  }
}

