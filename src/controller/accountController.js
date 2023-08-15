const puppeteer = require("puppeteer");
const log = require("log-to-file");
import { randomInt } from "crypto";
const addAccount = async function (message, user) {
    try {
        let [SvID, password] = message.split("|");
        SvID = SvID.trim();
        password = password.trim();
        let tkb = await getTKB(SvID, password);
        console.log("Đã lấy tkb xong");
        let tkb_json = JSON.stringify(fillterTKB(tkb));
        log(tkb_json);
        console.log("Hoàn  thành               ---------------------");
        return {
            text: tkb_json,
        };
    } catch (e) {
        console.log(e);
        return {
            text: "Lỗi thử lại ...",
        };
    }
};
const getTKB = async (ID, pass) => {
    const url = process.env.URL_GET_TKB;
    let browser = await puppeteer.launch({
         headless: false,
    });
    let page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        "accept-language": "en-US,en;q=0.9,hy;q=0.8",
    });
    await page.setViewport({ width: 1800, height: 1600 });
    await page.goto(url); // đi đến URL
    console.log("ĐÃ vào dktc");
    await page.waitForSelector("#txtUserName", { timeout: 5000 });
    await page.type("#txtUserName", ID, { delay: randomInt(1, 5) * 50 });
    await page.waitForSelector("#txtPassword", { timeout: 5000 });
    await page.type("#txtPassword", pass, { delay: randomInt(1, 5) * 50 });
    console.log("ĐÃ nhập xong tk,mk");
    await page.click("#pnlLogin", { delay: randomInt(1, 5) * 200 });
    await page.click("#btnSubmit", { delay: randomInt(1, 5) * 100 });
    await page.waitForTimeout(2000);
    await page.keyboard.press("Enter");
    console.log("Chuyển qua bảng tkb");
    await page.goto("http://220.231.119.171/kcntt/Reports/Form/StudentTimeTable.aspx");
    console.log("Đang lấy data");
    const data = await page.evaluate(() => {
        let tableRows = Array.from(
            document.querySelectorAll(
                    "#Table2 #gridRegistered tbody tr.cssListItem"
                    )
                    );
                    tableRows = tableRows.concat(
                        Array.from(
                            document.querySelectorAll(
                                "#Table2 #gridRegistered tbody tr.cssListAlternativeItem"
                                )
                                )
                                );
                                return tableRows.map((row) => {
                                    const columns = Array.from(row.querySelectorAll("td"));
                                    return {
                                        stt: columns[0].textContent.replace(/[\t\n]/g, ""),
                lopHocPhan: columns[1].textContent.replace(/[\t\n]/g, ""),
                hocPhan: columns[2]
                    .querySelector("span")
                    .textContent.replace(/[\t\n]/g, ""),
                    thoiGian: columns[3].textContent.replace(/[\t\n]/g, ""),
                    diaDiem: columns[4].textContent.replace(/[\t\n]/g, ""),
                    giangVien: columns[5].textContent.replace(/[\t\n]/g, ""),
                    siSo: columns[6].textContent.replace(/[\t\n]/g, ""),
                    soDK: columns[7].textContent.replace(/[\t\n]/g, ""),
                    soTC: columns[8].textContent.replace(/[\t\n]/g, ""),
                    hocPhi: columns[9].textContent.replace(/[\t\n]/g, ""),
                    ghiChu: columns[10].textContent.replace(/[\t\n]/g, ""),
                };
            });
    });
    return data;
};
let fillterTKB = (tkb) => {
    let tkbComplete = [];
    tkb.forEach((element) => {
        let tuans = element.thoiGian.split("Từ");
        tuans.forEach((tuan) => {
            tuan = tuan.trim();
            if (tuan.length > 5) {
                const parts = tuan.split("đến")[0].trim().split("/");
                let ngayThang = new Date(parts[2], parts[1] - 1, parts[0]);
                tuan.split("   ").forEach((item) => {
                    item = item.trim();
                    if (item.startsWith("Thứ")) {
                        let thu = parseInt(item.substring(4, 5));
                        let startDiaDiem = element.diaDiem.indexOf(`[T${thu}]`) + 5
                        let stopDiaDiem = startDiaDiem + 9;
                        let diaDiem = element.diaDiem.substring(startDiaDiem, stopDiaDiem)
                        let tietHoc = {
                            ngay : ngayThang.setDate(ngayThang.getDate() + thu - 1),
                            tiet : item.split("Thứ "+thu, 2)[1],
                            monHoc : element.lopHocPhan,
                            diaDiem : diaDiem,   
                            giangVien : element.giangVien,
                        };
                        tkbComplete.push(tietHoc);
                    }
                });
            }
        });
    });
    return tkbComplete;
};
export default {
    addAccount,
};
