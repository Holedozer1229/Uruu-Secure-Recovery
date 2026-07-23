import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recoveryRouter from "./recovery";
import zkevmRouter from "./zkevm";
import onchainRouter from "./onchain";
import prometheusRouter from "./prometheus";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recoveryRouter);
router.use(zkevmRouter);
router.use(onchainRouter);
router.use(prometheusRouter);

export default router;
