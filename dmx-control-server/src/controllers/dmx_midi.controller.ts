import { Request, Response } from "express"
import { Program } from "../sequelize/models/program";
import { DmxLoop } from "../dmx_loop";
import { handleErrors, NotFoundError, validateUrlParam } from "./application.controller";

const getDmxMidi = async(req: Request) => {
  const id = validateUrlParam(req, 'program_id')
  const program = await Program.findByPk(id);

  if (!program) {
    throw new NotFoundError("Program not found")
  }

  const dmxMidi = await program.getOrInitDmxMidi()
  return dmxMidi
}

export class DmxMidiController {
    static async get(req: Request, res: Response) {
        handleErrors(req, res, async() => {
            const dmxMidi = await getDmxMidi(req)
            res.json(dmxMidi)
        })
    }

    static async update(req: Request, res: Response) {
        handleErrors(req, res, async() => {
            const dmxMidi = await getDmxMidi(req)

            const midi_patterns = req.body.midi_patterns

            await dmxMidi.update({
                midi_patterns: midi_patterns
            })

            DmxLoop.getInstance().reloadMidi()

            res.json(dmxMidi)
        })
    }
}