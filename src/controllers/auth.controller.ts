import { authService } from "@/services";
import type { Request, Response } from "express";

export const register = async (req: Request, res: Response) => {
  // service call
  const result = await authService.registerUser("Hi there");
  res.json(result);
};
