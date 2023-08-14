// Import các module cần thiết
import express from "express"; // Import module express để tạo ứng dụng web
import viewEngine from "./config/viewEngine.js"; // Import module viewEngine từ file viewEngine.js để cấu hình view engine
import initWebRoutes from "./routers/web.js"; // Import module initWebRoutes từ file web.js để cấu hình router
import bodyParser from "body-parser"; // Import module body-parser để phân tích và xử lý dữ liệu từ request body
import dotenv from "dotenv"; // Import module dotenv
import connect from "../database/database.js";

// Tạo ứng dụng Express
dotenv.config();
let app = express();

// Cấu hình view engine
viewEngine(app);

// Phân tích request thành dữ liệu JSON
app.use(bodyParser.json());

// Phân tích và xử lý dữ liệu từ request body với các loại dữ liệu phức tạp
app.use(bodyParser.urlencoded({ extended: true }));

// Cấu hình các route cho ứng dụng web
initWebRoutes(app);

let port = process.env.PORT || 3000;
app.listen(port, async () => {
    await connect();
    console.log("Chatbot running at "+port);
})