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

export const deleteProgram: (id: number) => Promise<void> = (id) => axios
  .delete(`${BASE_PATH}/programs/${id}`)

export const getProgramMidi: (program_id: number) => Promise<MidiData> = (program_id) => axios
  .get(`${BASE_PATH}/programs/${program_id}/midi`)
  .then((response) => response.data)


export const uploadMidiToProgram: (program_id: number, file: File) => Promise<void> = (program_id, file) => {
    const formData = new FormData()
    formData.append("file", file)

    return axios.put(
    `${BASE_PATH}/programs/${program_id}/midi`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
}

export const resetProgramMidi: (program_id: number) => Promise<void> = (program_id) => axios
  .delete(`${BASE_PATH}/programs/${program_id}/midi`)


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

