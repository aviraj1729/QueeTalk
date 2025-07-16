import dotenv from "dotenv";
import { httpServer } from "./app.js";
import connectDB from "./config/mongodb.js";

dotenv.config({ path: "./.env" });

const startServer = () => {
  httpServer.listen(process.env.PORT || 8000, () => {
    console.log(`server started at port ${process.env.PORT}`);
  });
};

const majorNodeVersion = +process.env.NODE_VERSION?.split(".")[0] || 0;

if (majorNodeVersion >= 14) {
  try {
    await connectDB();
    startServer();
  } catch (err) {
    console.log(err);
  }
} else {
  connectDB()
    .then(() => {
      startServer();
    })
    .catch((err) => {
      console.log(err);
    });
}
