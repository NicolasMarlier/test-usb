import { Request, Response } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { Program } from "../sequelize/models/program"
import { handleErrors, NotFoundError, validateUrlParam } from "./application.controller"

const UPLOADS_DIR = path.join(__dirname, "../../uploads/audio")

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname)
    cb(null, `program_${req.params.id}${ext}`)
  },
})

export const audioUpload = multer({ storage })

const getProgram = async (req: Request) => {
  const id = validateUrlParam(req, "id")
  const program = await Program.findByPk(id)
  if (!program) throw new NotFoundError("Program not found")
  return program
}

const existingAudioPath = (programId: number): string | null => {
  const candidates = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith(`program_${programId}.`))
  return candidates.length > 0 ? path.join(UPLOADS_DIR, candidates[0]!) : null
}

export class ProgramsAudioController {

  static async upload(req: Request, res: Response) {
    handleErrors(req, res, async () => {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" })
        return
      }

      const program = await getProgram(req)

      // Delete any old file with a different extension than the one just saved
      fs.readdirSync(UPLOADS_DIR)
        .filter(f => f.startsWith(`program_${program.id}.`) && f !== req.file!.filename)
        .forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)))

      await program.update({ audio_filename: req.file.originalname })
      res.json({ status: "ok", audio_filename: req.file.originalname })
    })
  }

  static async reset(req: Request, res: Response) {
    handleErrors(req, res, async () => {
      const program = await getProgram(req)

      const existing = existingAudioPath(program.id)
      if (existing) fs.unlinkSync(existing)

      await program.update({ audio_filename: null })
      res.json({ status: "ok" })
    })
  }

  static async getAudio(req: Request, res: Response) {
    handleErrors(req, res, async () => {
      const program = await getProgram(req)

      const filePath = existingAudioPath(program.id)
      if (!filePath) throw new NotFoundError("No audio file for this program")

      res.sendFile(filePath)
    })
  }
}
