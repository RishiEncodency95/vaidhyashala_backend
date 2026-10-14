import { Admin } from "../models/Admin.model";
import { logger } from "./logger";

export const autoSeedSuperAdmin = async (): Promise<void> => {
  try {
    const existing = await Admin.findOne({ email: "admin@vedhshala.com" });
    if (!existing) {
      await Admin.create({
        name: "Super Admin",
        email: "admin@vedhshala.com",
        phone: "+91 9876543210",
        employeeId: "EMP-0001",
        password: "Admin@12345",
        role: "superadmin",
        isTwoFactorEnabled: false,
        isActive: true,
      });
      logger.info("🌱 Default Super Admin (admin@vedhshala.com) auto-seeded successfully");
    }
  } catch (err: any) {
    logger.warn("Auto-seed superadmin check warning: " + (err?.message || err));
  }
};
