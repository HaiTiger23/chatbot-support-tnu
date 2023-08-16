const puppeteer = require("puppeteer-extra");
const log = require("log-to-file");
import { randomInt } from "crypto";
import {Account,Lesson } from "../models/index.js";
import moment from "moment/moment.js";
const addAccount = async function (message, user) {
    try {
      
        let [SvID, password] = message.split("|");
        SvID = SvID.trim();
        password = password.trim();
        let tkb = await getTKB(SvID, password);
        console.log("Đã lấy tkb");
        tkb = fillterTKB(tkb);
        console.log(tkb);
        log(JSON.stringify(tkb))
        if(tkb.length > 0) {
            let account = await createAccount(user, SvID, password);
            await saveTKB(tkb, account);
            return {
                text: "Đăng nhập thành công. Bạn có thể dùng chức năng xem lịch",
            };
        }else {
            return {
                text: "sai thông tin tài khoản hoặc đã có lỗi xảy ra, thử lại sau",
            };
        }
    } catch (e) {
        console.log(e);
        return {
            text: "Lỗi thử lại ...",
        };
    }
};
let saveTKB = async function(tkb, account) {
    // Xóa tất cả tkb cũ
    await Lesson.deleteMany({svid: account.SVID});
    tkb.forEach( async (e)=> {
        e.svid = account.SVID;
        await Lesson.create(e);
    });

}
let createAccount = async (user,SVID,password) => {
    let existingAccount = await Account.findOne({ psid: user.SVID}).exec();
    if(!existingAccount) {
       return await Account.create({
            psid : user.psid,
            SVID,
            password
        })

    }else {
        return existingAccount;
    }
}
const getTKB = async (ID, pass) => {
    const url = process.env.URL_GET_TKB;
    let browser = await puppeteer.launch({
        // headless: false,
        args: ["--no-sandbox"],
    });
    let page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        "accept-language": "en-US,en;q=0.9,hy;q=0.8",
    });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36'
       )
    await page.setViewport({ width: 1800, height: 1600 });
    await page.goto(url); // đi đến URL
    await page.waitForSelector("#txtUserName", { timeout: 5000 });
    await page.type("#txtUserName", ID, { delay: randomInt(1, 5) * 50 });
    await page.waitForSelector("#txtPassword", { timeout: 5000 });
    await page.type("#txtPassword", pass, { delay: randomInt(1, 5) * 50 });
    await page.click("#pnlLogin", { delay: randomInt(1, 5) * 200 });
    await page.click("#btnSubmit", { delay: randomInt(1, 5) * 100 });
    page.on('dialog', async (dialog) => {
        console.log('Cảnh báo:', dialog.message());
        await dialog.accept(); // Để đóng cửa sổ cảnh báo
      });
    // await page.goto(
    //     "http://220.231.119.171/kcntt/(S(wnpxw0tmpzjuo0moqqygskoy))/Reports/Form/StudentTimeTable.aspx"
    // );
    await page.waitForTimeout(2000);
    const data = await page.evaluate(() => {
        let tableRows = Array.from(
            document.querySelectorAll(
                ".cssRangeItem3"
            )
        );
        return tableRows.map((row) => {
            const columns = Array.from(row.querySelectorAll("td"));
            return {
                stt: columns[0].textContent.replace(/[\t\n]/g, ""),
                lopHocPhan: columns[2].textContent.replace(/[\t\n]/g, ""),
                hocPhan: columns[3]
                    .querySelector("span")
                    .textContent.replace(/[\t\n]/g, ""),
                thoiGian: columns[4].textContent.replace(/[\t\n]/g, ""),
                diaDiem: columns[5].textContent.replace(/[\t\n]/g, ""),
                giangVien: columns[6].textContent.replace(/[\t\n]/g, ""),
                siSo: columns[7].textContent.replace(/[\t\n]/g, ""),
            };
        });
    });
    return data;
};
let fillterTKB = (tkb) => {
    let tkbComplete = [];
    tkb.forEach((element) => {
        let periods = element.thoiGian.split("Từ");
        periods.forEach((period) => {
            period = period.trim();
            if (period.length > 5) {
                const {startDate, endDate} = getDateBetween(period);
                period.split("   ").forEach((item) => {
                    item = item.trim();
                    if (item.startsWith("Thứ")) {
                        let thu = parseInt(item.split(' ')[1]);
                        let dateThu = startDate.clone().add(thu -2, 'days')
                       
                        while(dateThu.isSameOrBefore(endDate)) {
                            let tuan = period.substring(period.indexOf(': (')+3,period.indexOf(': (')+4);
                            let room = findRoom(tuan,element.diaDiem);
                            let tietHoc = {
                                ngay : dateThu,
                                tiet : item.split("Thứ "+thu, 2)[1],
                                monHoc : element.lopHocPhan,
                                diaDiem : room,   
                                giangVien : element.giangVien,
                            };
                            tkbComplete.push(tietHoc);
                            dateThu = dateThu.clone().add(7, 'days');
                        }
                    }else if(item.startsWith("CN")) {

                    }
                });
            }
        });
    });
    return tkbComplete;
};
function findRoom(tuan, diaDiem) {
    console.log(diaDiem);
    if (diaDiem.startsWith('(')) {
        for (const e of diaDiem.split('(')) {
            if (e.length > 0) {
                let chuoiTim = e.split(')')[0];
                console.log(chuoiTim);
                if (chuoiTim.indexOf(tuan) !== -1) {
                    console.log("Tìm Thấy", e.split(')')[1]);
                    return  e.split(')')[1];
                }
            }
        }
    } else {
        return diaDiem;
    }
}
function getDateBetween(period) {
    let PeriodArray =  period.trim().split(":")[0].split("đến");
    let startDate = moment(PeriodArray[0].trim(), 'DD/MM/YYYY');
    let endDate = moment(PeriodArray[1].trim(), 'DD/MM/YYYY');
    return {startDate, endDate};
}
export default {
    addAccount,
};
