import mongoose from 'mongoose';
import dotenv from "dotenv"; // Import module dotenv

dotenv.config();
mongoose.set('strictQuery', true);

async function connect() {
    try {
        let conection =  await mongoose.connect(process.env.MONGO_URI);
        console.log("Connect mongoose connection 📑");
        return conection;
    } catch (error) {
        throw new Error(error.message);
    }
}
export default connect;