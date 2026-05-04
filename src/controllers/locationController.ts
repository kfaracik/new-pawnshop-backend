import { NextFunction, Request, Response } from "express";
import { Location } from "../models/locationModel";

const getAllLocations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await Location.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
};

export default {
  getAllLocations,
};
