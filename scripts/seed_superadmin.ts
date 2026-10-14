import { Admin } from "../src/models/Admin.model";
import { connectDB } from "../src/config/db";

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    let admin = await Admin.findOne({ email: "rishi.encodency95@gmail.com" });

    if (admin) {
      admin.password = "Rishi@123"; // Mongoose pre("save") will hash it once!
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      admin.isActive = true;
      admin.isTwoFactorEnabled = false;
      await admin.save();
      console.log("Updated Super Admin password to: Rishi@123 (2FA reset to false)");
    } else {
      admin = await Admin.create({
        name: "Rishi",
        email: "rishi.encodency95@gmail.com",
        phone: "+91 9876543210",
        employeeId: "EMP-0001",
        password: "Rishi@123", // Mongoose pre("save") will hash it once!
        role: "superadmin",
        isTwoFactorEnabled: false,
        isActive: true,
      });
      console.log("Created Super Admin:", admin.email);
    }

    // Verify password locally right now
    const testAdmin = await Admin.findOne({ email: "rishi.encodency95@gmail.com" }).select("+password");
    const matches = await testAdmin?.comparePassword("Rishi@123");
    console.log("Verification check: password matches Rishi@123?", matches);

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
