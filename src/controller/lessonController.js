import { Account, Lesson } from "../models"

const getLessonToday = async (psid)=> {
    let account = await Account.findOne({psid});
    if(!account) {
        return {
            text: "Bạn cần đăng nhập trước khi lấy thời khóa biểu"
        }
    }else {
        const today = getToDay();
        let ListLesson = await Lesson.find({
            svid: account.svid,
            $expr: {
                $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$ngay' } }, today]
              }
        })
        if(ListLesson.length == 0) {
            return {
                text: "Hôm nay bạn rảnh"
            }
        } 

        let text =`Ngày: ${getToDay()}\n`;
        ListLesson.forEach(element => {
            text += `- Môn: ${element.monHoc}\n- ${element.tiet}\n- Giáo Viên: ${element.giangVien}\n- Địa điểm: ${element.diaDiem} \n\n`
        });
        return {
            text: text
        }
    }

}
const getToDay = () => {
    const todayUtc7 = new Date();
    todayUtc7.setHours(todayUtc7.getHours() + 7); // Cộng thêm 7 giờ để chuyển sang UTC+7

    const year = todayUtc7.getUTCFullYear();
    const month = todayUtc7.getUTCMonth() + 1;
    const day = todayUtc7.getUTCDate();
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
export default {
    getLessonToday
}