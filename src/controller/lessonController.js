import { Account, Lesson } from "../models"
const moment = require('moment');
require('moment/locale/vi'); // Import gói ngôn ngữ tiếng Việt
const getLessonToday = async (psid)=> {
    let account = await Account.findOne({psid});
    if(!account) {
        return {
            text: "Bạn cần đăng nhập trước khi lấy thời khóa biểu"
        }
    }else {
        const today = moment().startOf('day');
        const endOfToday = moment().endOf('day');
        let ListLesson = await Lesson.find({
            svid: account.svid,
            ngay: {
                $gte: today.format('YYYY-MM-DD HH:mm:ss'),
                $lte: endOfToday.format('YYYY-MM-DD HH:mm:ss'),
            }
        }).sort('tiet')
        if(ListLesson.length == 0) {
            return {
                text: "Hôm nay bạn rảnh"
            }
        } 

        let text =`Ngày: ${today.format('dddd - DD/MM/YYYY')}\n`;
        ListLesson.forEach(element => {
            text += `- Môn: ${element.monHoc}\n-Tiết:  ${element.TietBatDau} ->  ${element.TietKetThuc}\n- Giáo Viên: ${element.giangVien}\n- Địa điểm: ${element.diaDiem} \n\n`
        });
        console.log(text);
        return {
            text: text
        }
    }

}

export default {
    getLessonToday
}