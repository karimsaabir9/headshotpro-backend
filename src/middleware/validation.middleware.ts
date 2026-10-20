import { z, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { logger } from "@/util/logger";

export const validate = (schema: z.ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("req.body", req.body);
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // convert zod error to json
        const errors = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        logger.error("Validation error", errors);
        next(errors);
      } else {
        logger.error("Unknown error", (error as Error).message);
        next(error);
      }
    }
  };
};
