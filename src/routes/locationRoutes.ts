import { Router } from "express";
import locationController from "../controllers/locationController";

const router = Router();

router.get("/", locationController.getAllLocations);

export default router;
