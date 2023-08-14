import dotenv from "dotenv";
import userInteractingController from "./userInteractingController.js";
const request = require("request");
dotenv.config();

var ListUserInteracting = [];
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

let getHomePage = (req, res) => {
    return res.send("Home Page");
};
let getWebhook = (req, res) => {
    console.log("alo check");
    // Parse the query params
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode is in the query string of the request
    if (mode && token) {
        // Check the mode and token sent is correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Respond with the challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Respond with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};
let postWebhook = (req, res) => {
    let body = req.body;
    if (body.object === "page") {
        body.entry.forEach((entry) => {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(entry);
            console.log(webhook_event);
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log("Sender PSID: " + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        res.status(200).send("EVENT_RECEIVED");
        // Returns a '200 OK' response to all requests
        // Determine which webhooks were triggered and get sender PSIDs and locale, message content and more.
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};
// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;
    
    // Check if the message contains text
    if (received_message.text) {
        let user = userInteractingController.getUser(
            ListUserInteracting,
            sender_psid
        );

        const message = received_message.text;
        if (message.startsWith("/start")) {
            userInteractingController.addUser(ListUserInteracting, sender_psid);
            response = {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [
                            {
                                title: "Chọn chức năng bạn muốn sử dụng?",
                                subtitle: "Trả lời ở nút dưới.",
                                buttons: [
                                    {
                                        type: "postback",
                                        title: "thông tin đăng nhập",
                                        payload: "account_infor",
                                    },
                                    {
                                        type: "postback",
                                        title: "Xem TKB hôm nay",
                                        payload: "view_schedule_today",
                                    },
                                    {
                                        type: "postback",
                                        title: "Xem TKB cả tuần",
                                        payload: "view_schedule_week",
                                    },
                                ],
                            },
                        ],
                    },
                },
            };
        } else if (message.startsWith("/stop")) {
            userInteractingController.deleteUser(
                ListUserInteracting,
                sender_psid
            );
            response = {
                text: `Hẹn gặp lại bạn sau`,
            };
        } else {
            if (user) {
                // Kiểm tra user có tồn tại không
                response = OptionSelected(message, user);
            } else {
                response = {
                    text: `nhập /start để bắt đầu`,
                };
            }
        }
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Mày gửi ảnh này à?",
                            subtitle: "Trả lời ở nút sau.",
                            image_url: attachment_url,
                            buttons: [
                                {
                                    type: "postback",
                                    title: "ừ!",
                                    payload: "yes",
                                },
                                {
                                    type: "postback",
                                    title: "Không!",
                                    payload: "no",
                                },
                            ],
                        },
                    ],
                },
            },
        };
    }

    // Sends the response message
    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;
    let user = ListUserInteracting.find((e) => e.psid === sender_psid);
    if (user) {
        user.step = payload;
        userInteractingController.updateUser(ListUserInteracting, user);
        // Set the response based on the postback payload
        switch (payload) {
            case "account_infor":
                response = {
                    text: "Nhập thông tin tài khoản mật khẩu theo mẫu: Tài khoản|Mật khẩu",
                };
                break;
            case "view_schedule_today":
                response = { text: "Thời khóa biểu hôm nay ngày....!" };
                break;
            case "view_schedule_week":
                response = {
                    text: "Thời khóa biểu tuần này từ ... đến ngày .... ",
                };
                break;

            default:
                break;
        }
    } else {
        response = {
            text: `Gõ /start để bắt đầu`,
        };
    }
    // if (payload === 'yes') {
    //   response = { "text": "Gửi làm gì, ai cần!" }
    // } else if (payload === 'no') {
    //   response = { "text": "Mày điêu, mày không gửi thì ai." }
    // }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    console.log(
        "-------------------------------------------List User đang hoạt động:------------------- "
    );
    console.log(ListUserInteracting);
    console.log(
        "================================================================"
    );
    // Construct the message body
    let request_body = {
        recipient: {
            id: sender_psid,
        },
        message: response,
    };

    // Send the HTTP request to the Messenger Platform
    request(
        {
            uri: "https://graph.facebook.com/v2.6/me/messages",
            qs: { access_token: PAGE_ACCESS_TOKEN },
            method: "POST",
            json: request_body,
        },
        (err, res, body) => {
            if (!err) {
                console.log("message sent!");
            } else {
                console.error("Unable to send message:" + err);
            }
        }
    );
}
async function sendTKB(req, res) {
    let response = {
        text: "Tiết: 6 --> 8 \n\nMôn học: Quản lý dự án Công nghệ thông tin-1-23 (K19AB.KTPM.D1.K1.N01) \n\nPhòng học: C2.203 (CLC) ",
    };
    await callSendAPI(6413765355409451, response);
    res.send("send success");
}
function OptionSelected() {
    switch (user.step) {
        case "account_infor":
            return addAccount(message, user);
            break;

        default:
            return {
                text: "Comming soon...",
            };
            break;
    }
}
export default {
    getHomePage,
    getWebhook,
    postWebhook,
    sendTKB,
};
