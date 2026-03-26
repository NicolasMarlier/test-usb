import { Request, Response } from "express"
import { MidiFileHandler } from "../midi_file_handler"
import { Program } from "../sequelize/models/program";
import { DmxLoop } from "../dmx_loop";

export class ProgramsController {

    static async list(req: Request, res: Response) {
        try {
          const programs = await Program.findAll({order: [['id', 'ASC']]})
    
          res.json(programs);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Failed to fetch DMX buttons" });
        }
    }

    static async create(req: Request, res: Response) {
        return Program
            .create({name: req.body.name})
            .then((program) => res.json({
                status: 'ok',
                program: program
            }))
    }

    static async update(req: Request, res: Response) {
        console.log('YOYPYYYOOYOYOYO', {name: req.body.name, id: req.body.id})
        Program.update({name: req.body.name, id: req.body.id}, {
            where: { id: req.params.id}
        }).then(() => res.json({status: 'ok'}))
    }

    static async destroy(req: Request, res: Response) {
        Program.destroy({
            where: { id: req.params.id}
        }).then(() => res.json({status: 'ok'}))
    }

    static async upload_midi(req: Request, res: Response) {
        
        try {
            if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
            }

            const midi = MidiFileHandler.fromUpload(
                req.file.buffer,
                req.file.originalname,
                "midi_files"
            );

            Program.update({midi_filename: midi.filePath}, {
                where: { id: req.params.id}
            }).then(() => res.json({
                ppq: midi.getPPQ(),
                tempo: midi.getTempo(),
                message: "MIDI loaded successfully",
            }))

            
        } catch (err) {
            res.status(500).json({ error: "Invalid MIDI file" });
        }
    }

    static async reset_midi(req: Request, res: Response) {
        Program.update({midi_filename: null}, {
            where: { id: req.params.id}
        }).then(() => res.json({status: 'ok'}))
    }

    static async get_midi(req: Request, res: Response) {
        
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ error: "Invalid program_id parameter" });
            }
            const program = await Program.findByPk(id)
            if(!program) {
                res.status(404).json({ error: "Failed to fetch Program" });
            }
            else if(!program.midi_filename) {
                res.status(404).json({ error: "No midi for program" });
            }
            else {
                const midiFileHandler = MidiFileHandler.fromFile(program.midi_filename)
                res.json({
                    filename: program.midi_filename,
                    tempo: midiFileHandler.getTempo(),
                    notes: midiFileHandler.midiNotes
                })
            }
        } catch (error) {
          console.error(error);
          res.status(404).json({ error: "Failed to fetch Program" });
        }
        
    }
}