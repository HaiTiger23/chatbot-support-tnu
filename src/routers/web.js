import { Router } from "express";
import chatbotController from "../controller/chatbotController"
import gcalendar from "../controller/GCalendarController"
let router = Router();

let initWebRoutes = (app) => {
    router.get("/",chatbotController.getHomePage)
    router.get("/webhook", chatbotController.getWebhook);
    router.post("/webhook", chatbotController.postWebhook);
    router.get("/gcalendar", gcalendar.initCalendar);

    return app.use("/", router)
}

export default initWebRoutes;