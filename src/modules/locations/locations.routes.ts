import { Router } from "express";
import { getCountries, getStates, getCities } from "./locations.controller";

const router = Router();

// Paths match what the website's forms already call.
router.get("/crm-countries", getCountries);
router.get("/crm-states", getStates);
router.get("/crm-cities", getCities);

export default router;
