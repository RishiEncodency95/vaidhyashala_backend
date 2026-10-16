import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  submitContactEnquiry,
  getAllContactEnquiries,
  getContactEnquiryById,
  updateContactEnquiry,
  deleteContactEnquiry,
} from "./contactEnquiry.controller";

const router = Router();

router.post("/", submitContactEnquiry);
// Admin only: these return / change visitors' names, phones and messages
router.get("/", protect, getAllContactEnquiries);
router.get("/:id", protect, getContactEnquiryById);
router.put("/:id", protect, updateContactEnquiry);
router.delete("/:id", protect, deleteContactEnquiry);

export default router;
