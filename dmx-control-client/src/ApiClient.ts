import axios from "axios"

const BASE_PATH = 'http://localhost:3000'

export const listPrograms: () => Promise<Program[]> = () => axios
  .get(`${BASE_PATH}/programs`)
  .then((response) => response.data as Program[])

export const createProgram: (dict: {name: string}) => Promise<void> = ({name}) => axios
  .post(`${BASE_PATH}/programs`, {name})

export const updateProgram: (program_id: number, program: Program) => Promise<void> = (program_id, program) => axios
  .put(`${BASE_PATH}/programs/${program_id}`, program)

export const deleteProgram: (program_id: number) => Promise<void> = (program_id) => axios
  .delete(`${BASE_PATH}/programs/${program_id}`)

export const uploadMidiToProgram: (program_id: number, file: File) => Promise<void> = (program_id, file) => {
    const formData = new FormData()
    formData.append("file", file)

    return axios.post(
    `${BASE_PATH}/programs/${program_id}/upload-midi`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
}

export const listDmxButtons: (program_id: number) => Promise<DmxButtonConfig[]> = (program_id) => axios
  .get(`${BASE_PATH}/dmx_buttons`, {params: {program_id}})
  .then((response) => response.data as DmxButtonConfig[])

export const createDmxButton: () => Promise<void> = () => axios
  .post(`${BASE_PATH}/dmx_buttons`, {})

export const updateDmxButton: (dmx_button_id: number, dmx_button: DmxButtonConfig) => Promise<void> = (dmx_button_id, dmx_button) => axios
  .put(`${BASE_PATH}/dmx_buttons/${dmx_button_id}`, dmx_button)

export const deleteDmxButton: (dmx_button_id: number) => Promise<void> = (dmx_button_id) => axios
  .delete(`${BASE_PATH}/dmx_buttons/${dmx_button_id}`)

