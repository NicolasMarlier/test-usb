import { Request, Response } from "express"

export class InvalidParamError extends Error {}
export class NotFoundError extends Error {}


export const validateUrlParam = (req: Request, key: string) => {
      const param = req.params[key]
    
      if (!param || typeof param !== "string") {
        throw new InvalidParamError(`Invalid ${key} parameter`)
      }
      return param
    }

export const validateQueryParam = (req: Request, key: string) => {
      const param = req.query[key]
    
      if (!param || typeof param !== "string") {
        throw new InvalidParamError(`Invalid ${key} parameter`)
      }
      return param
    }


export const handleErrors = async(req: Request, res: Response, action: () => void) =>  {
    try {
        await action()
    } catch (error) {
        if (error instanceof InvalidParamError) {
            return res.status(400).json({ error: error.message });
        }
        if (error instanceof NotFoundError) {
            return res.status(404).json({ error: error.message });
        }
        console.error(error);
        res.status(500).json({ error: 'Unknown error' });
    }   
}
