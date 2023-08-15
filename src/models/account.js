import { Schema,ObjectId } from "mongoose"
import mongoose from "mongoose";

const Account = mongoose.model('Account',
    new Schema({
        id: {
            type: ObjectId
        },
       psid: {
        type: String,
       },
       SVID: {
        type: String,
       },
       password: {
        type: String,
       }
    })    
)
export default Account