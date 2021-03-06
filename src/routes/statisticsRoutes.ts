import express from "express";
import statisticsController from "../controllers/statisticsController";

const statisticsRoutes = express.Router();

statisticsRoutes.post("/", statisticsController.addSkillsToStatistics);
statisticsRoutes.get("/:skillId", statisticsController.getStatisticBySkillId);
statisticsRoutes.post("/delete", statisticsController.removeSkills);

export default statisticsRoutes;
