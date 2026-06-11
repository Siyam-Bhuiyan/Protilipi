import mongoose from "mongoose";

// Cache the connection across hot reloads in Next.js dev mode
const connect = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(process.env.MONGO);
  } catch (error) {
    throw new Error("Connection failed: " + error.message);
  }
};

export default connect;
