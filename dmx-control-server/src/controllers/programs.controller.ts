
import { Request, Response } from "express";
const { models } = require('./sequelize');


export class ProgramsController {

    static async list(req: Request, res: Response) {
        try {
          const programs = await models.Program.findAll({order: [['id', 'ASC']]})
    
          res.json(programs);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Failed to fetch DMX buttons" });
        }
    }

    static async create(req: Request, res: Response) {
        models.Program.create({name: req.body.name}).then(() => res.json({status: 'ok'}))
    }

    static async update(req: Request, res: Response) {
        models.Program.update({name: req.body.name, id: req.body.id}, {
            where: { id: req.params.program_id}
        }).then(() => res.json({status: 'ok'}))
    }

    static async destroy(req: Request, res: Response) {
        models.Program.destroy({
            where: { id: req.params.program_id}
        }).then(() => res.json({status: 'ok'}))
    }

    static async upload_midi(req: Request, res: Response) {
        console.log("TCHUSS")
        try {
            if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
            }

            const midi = MidiFileHandler.fromUpload(
            req.file.buffer,
            req.file.originalname,
            "midi_files"
            );

            console.log('HELLO', midi)

            models.Program.update({midi_filename: midi.filePath}, {
            where: { id: req.params.program_id}
            }).then(() => res.json({
            ppq: midi.getPPQ(),
            tempo: midi.getTempo(),
            message: "MIDI loaded successfully",
            }))

            
        } catch (err) {
            res.status(500).json({ error: "Invalid MIDI file" });
        }
    }
}