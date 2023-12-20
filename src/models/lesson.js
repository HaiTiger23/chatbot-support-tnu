import { Schema,ObjectId } from "mongoose"
import mongoose from "mongoose";

const Lesson = mongoose.model('Lesson',
    new Schema({
        id: {
            type: ObjectId
        },
       psid: {
        type: String,
       },
       ngay: {
        type: Date,
       },
       TietBatDau: {
        type: Number,
       },
       TietKetThuc: {
        type: Number,
       },
       monHoc: {
        type: String,
       },
       diaDiem: {
        type: String,
       },
       giangVien: {
        type: String,
       }
    })    
)
export default Lesson