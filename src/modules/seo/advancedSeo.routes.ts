import { Router } from "express";
import multer from "multer";
import { advancedSeoController } from "./advancedSeo.controller";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Read by the website (scripts, social links, the list of uploaded root files)
router.get("/advanced", advancedSeoController.getAdvancedSeo);

// Changes need an admin login with the Settings permission: uploaded files are served from the
// website's root (/robots.txt, /sitemap.xml, verification files)
const canManage = [protect, requirePermission("perm_settings_manage")];
router.put("/scripts", ...canManage, advancedSeoController.updateScripts);
router.put("/social-links", ...canManage, advancedSeoController.updateSocialLinks);
router.post("/upload-file", ...canManage, upload.single("file"), advancedSeoController.uploadFile);
router.delete("/file/:fileId", ...canManage, advancedSeoController.deleteFile);

export default router;
