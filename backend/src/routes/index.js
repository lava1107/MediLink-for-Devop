import { Router } from "express";

import authRoutes from "./authRoutes.js";
import branchRoutes from "./branchRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import userRoutes from "./userRoutes.js";
import medicineRoutes from "./medicineRoutes.js";
import batchRoutes from "./batchRoutes.js";
import supplierRoutes from "./supplierRoutes.js";
import customerRoutes from "./customerRoutes.js";
import purchaseRoutes from "./purchaseRoutes.js";
import saleRoutes from "./saleRoutes.js";
import reservationRoutes from "./reservationRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";
import partnerShopRoutes from "./partnerShopRoutes.js";
import prescriptionRoutes from "./prescriptionRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import reportRoutes from "./reportRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import communicationRoutes from "./communicationRoutes.js";
import chatRoutes from "./chatRoutes.js";
import { getBootstrapData } from "../controllers/bootstrapController.js";

const router = Router();

// Single-call bootstrap endpoint for frontend AppContext sync
router.get("/bootstrap", getBootstrapData);

// Modular REST routes
router.use("/auth", authRoutes);
router.use("/branches", branchRoutes);
router.use("/categories", categoryRoutes);
router.use("/users", userRoutes);
router.use("/medicines", medicineRoutes);
router.use("/batches", batchRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/customers", customerRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/reservations", reservationRoutes);
router.use("/availability", availabilityRoutes);
router.use("/partner-shops", partnerShopRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/communication", communicationRoutes);
router.use("/chat", chatRoutes);


export default router;
