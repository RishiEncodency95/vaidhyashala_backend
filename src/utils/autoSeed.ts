import { Admin } from "../models/Admin.model";
import { logger } from "./logger";

export const autoSeedSuperAdmin = async (): Promise<void> => {
  try {
    const existing = await Admin.findOne({ email: "rishi.encodency95@gmail.com" });
    if (!existing) {
      await Admin.create({
        name: "Rishi",
        email: "rishi.encodency95@gmail.com",
        phone: "+91 9876543210",
        employeeId: "EMP-0001",
        password: "Rishi@123",
        role: "superadmin",
        isTwoFactorEnabled: false,
        isActive: true,
      });
      logger.info("🌱 Default Super Admin (rishi.encodency95@gmail.com) auto-seeded successfully");
    }
  } catch (err: any) {
    logger.warn("Auto-seed superadmin check warning: " + (err?.message || err));
  }
};
