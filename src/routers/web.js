import { Router } from "express";
import chatbotController from "../controller/chatbotController"
let router = Router();

let initWebRoutes = (app) => {
    router.get("/",chatbotController.getHomePage)
    router.get("/webhook", chatbotController.getWebhook);
    router.post("/webhook", chatbotController.postWebhook);

    return app.use("/", router)
}

export default initWebRoutes;