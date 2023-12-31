import dotenv from "dotenv";
import userInteractingController from "./userInteractingController.js";
import accountController from "./accountController.js";
import Account from "../models/account.js";
import lessonController from "./lessonController.js";
import axios from"axios"
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
        body.entry.forEach( async (entry) => {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log("Sender PSID: " + sender_psid);
            
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
              await  handlePostback(sender_psid, webhook_event.postback);
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
async function handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text) {
        // let userInfor = await getUserInfo(sender_psid,PAGE_ACCESS_TOKEN)
        // console.log(userInfor);
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
            ListUserInteracting = ListUserInteracting.filter(e => e.psid !== sender_psid)
            response = {
                text: `Hẹn gặp lại bạn sau`,
            };
        } else {
            let user = userInteractingController.getUser(
                ListUserInteracting,
                sender_psid
            );
            if (user) {
                // Kiểm tra user có tồn tại không
                response = await OptionSelected(message, user);
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
async function handlePostback(sender_psid, received_postback) {
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;
    let user = ListUserInteracting.find((e) => e.psid === sender_psid);
    if (user) {
        // Set the response based on the postback payload
        switch (payload) {
            case "account_infor":
                let user_db = await Account.findOne({'psid': sender_psid})
                if (user_db) {
                    user.step = 0;
                    userInteractingController.updateUser(ListUserInteracting, user);
                    response = { text: `SVID: ${user_db.SVID} \nPassword: ${user_db.password}` };
                }else {
                    user.step = payload;
                    userInteractingController.updateUser(ListUserInteracting, user);
                    response = { text: "Bạn chưa có tài khoản, Nhập thông tin tài khoản mật khẩu theo mẫu: Tài khoản|Mật khẩu .Để đăng ký", };
                }
                break;
            case "view_schedule_today":
                user.step = "0";
                userInteractingController.updateUser(ListUserInteracting, user);
                response = await lessonController.getLessonToday(user.psid);
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
    // Construct the message body
    let request_body = {
        recipient: {
            id: sender_psid,
        },
        message: response,
    };
    try{
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
                    console.log("đã gửi message lại");
                } else {
                    console.error("Unable to send message:" + err);
                }
            }
        );
    }catch(err) {
        console.log(err);
    }
    // Send the HTTP request to the Messenger Platform
    
}
async function OptionSelected(message, user) {
    switch (user.step) {
        case "account_infor":
            user.step = "0";
            userInteractingController.updateUser(ListUserInteracting, user);
            return await accountController.addAccount(message, user);
            break;
        default:
            return {
                text: "Comming soon...",
            };
            break;
    }
}
async function getUserInfo(psid, token) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${psid}?fields=first_name,last_name,gender&access_token=${token}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }
export default {
    getHomePage,
    getWebhook,
    postWebhook,
};
