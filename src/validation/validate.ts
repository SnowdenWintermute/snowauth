import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import SnowAuthError from "../errors/custom-error.js";

export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    console.log(req.body);
    try {
      schema.parse({
        params: req.params,
        query: req.query,
        body: req.body,
      });
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((error) => {
          let field;
          if (error.path[0] === "body" && error.path[1]) field = error.path[1] as string;
          return new SnowAuthError(error.message, 400, field);
        });
        next(errors);
      } else next(err);
    }
  };
