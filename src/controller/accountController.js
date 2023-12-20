const puppeteer = require("puppeteer-extra");
const log = require("log-to-file");
import dotenv from "dotenv";
import axios from "axios";
import { randomInt } from "crypto";
import moment from "moment-timezone";
import { Account, Lesson } from "../models/index.js";
import excelController from "./excelController.js";
dotenv.config();


const addAccount = async function (message, user) {
    try {
        let [SvID, password] = message.split("|");
        SvID = SvID.trim();
        password = password.trim();
        let tkbBase = await getTKB(SvID, password);
        if(tkbBase == false) {
            return "Lỗi lấy thông tin, hãy thử lại sau ..."
        }
        console.log(tkbBase.length);
        let tkb = fillterTKB(tkbBase);
        console.log(tkb);
        log(JSON.stringify(tkb), "TKBComplete");
        if(tkb.length > 0) {
            let account = await createAccount(user, SvID, password);
            await saveTKB(tkb, account);
            return  "Đăng nhập thành công. Bạn có thể dùng chức năng xem lịch"
        }else {
            return "Sai thông tin tài khoản hoặc đã có lỗi xảy ra, thử lại sau"
        }
    } catch (e) {
        console.log(e);
        return  "Lỗi thử lại ..."
    }
};
let saveTKB = async function (tkb, account) {
    // Xóa tất cả tkb cũ
    await Lesson.deleteMany({ svid: account.SVID });
    tkb.forEach(async (e) => {
        e.svid = account.SVID;
        await Lesson.create(e);
    });
};
let createAccount = async (user, SVID, password) => {
    let existingAccount = await Account.findOne({ psid: user.SVID }).exec();
    if (!existingAccount) {
        return await Account.create({
            psid: user.psid,
            SVID,
            password,
        });
    } else {
        return existingAccount;
    }
};
const getTKB = async (ID, pass) => {
    const url = process.env.URL_LOGIN;
    let browser = await puppeteer.launch({
        // headless: false,
        args: ["--no-sandbox"],
    });
    let page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        "accept-language": "en-US,en;q=0.9,hy;q=0.8",
    });
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36"
    );
    await page.setViewport({ width: 1800, height: 1600 });
    await page.goto(url); // đi đến URL
    await page.waitForSelector("#txtUserName", { timeout: 5000 });
    await page.type("#txtUserName", ID, { delay: randomInt(1, 5) * 50 });
    await page.waitForSelector("#txtPassword", { timeout: 5000 });
    await page.type("#txtPassword", pass, { delay: randomInt(1, 5) * 50 });
    await page.click("#pnlLogin", { delay: randomInt(1, 5) * 200 });
    await page.click("#btnSubmit", { delay: randomInt(1, 5) * 100 });
    page.on("dialog", async (dialog) => {
        await dialog.accept(); // Để đóng cửa sổ cảnh báo
    });

    const cookies = await page.cookies();
    let cookie = cookies.find((cookie) => cookie.name === "SignIn");
    if (cookie) {
        console.log("cookie: " + cookie);
        let dataPost = await getPostValue(cookie, page);
        let data = await getTKBFromExcelFile(dataPost, cookie, ID);
        return data;
    } else {
        return false;
    }
};
let fillterTKB = (tkbBase) => {
    let tkbComplete = [];
    let startWeek = undefined;
    let EndWeek = undefined;
    for (let index = 0; index < tkbBase.length; index++) {
        const element = tkbBase[index];
        if (element.length == 2) {
            startWeek = moment(
                element[1].split("(")[1].split("đến")[0],
                "DD/MM/YYYY"
            );
            EndWeek = moment(
                element[1].split("(")[1].split("đến")[0].trim(")"),
                "DD/MM/YYYY"
            );
        } else if (element.length == 6) {
            console.log("Thêm tiết", element);
            let tietHoc = {
                ngay: startWeek.clone().add(parseInt(element[3]) -2,  "days"),
                TietBatDau:  element[4].split('-->')[0],
                TietKetThuc: element[4].split('-->')[1],
                monHoc: element[1],
                diaDiem: element[5],
                giangVien: element[2],
            };
            tkbComplete.push(tietHoc);
        }
    }
    
    return tkbComplete;
};


async function getTKBFromExcelFile(dataPost, SignIn, ID) {
    let stringDataPost = createStringDataPost(dataPost)
        .trim()
        .replace(/\s+/g, "");
    const url = process.env.URL_GET_TKB;
    const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language":
            "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7,fr-FR;q=0.6,fr;q=0.5",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        "upgrade-insecure-requests": "1",
        cookie: `SignIn=${SignIn.value}`,
        Referer: process.env.URL_GET_TKB,
        "Referrer-Policy": "strict-origin-when-cross-origin",
    };
    const response = await axios({
        method: "POST",
        url: url,
        data: stringDataPost,
        headers: headers,
        responseType: "arraybuffer",
    });
    console.log(response);
    log({response})
    let excelPath = await excelController.create(response.data, ID);
    return excelController.read(excelPath);
}

async function getPostValue(cookie, page) {
    const response = await axios.get(
        "http://220.231.119.171/kcntt/(S(snnjio0bgtj5l1atqz1kwvbz))/Reports/Form/StudentTimeTable.aspx",
        {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language":
                    "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7,fr-FR;q=0.6,fr;q=0.5",
                "upgrade-insecure-requests": "1",
                cookie: `SignIn=${cookie.value}`,
                Referer:
                    "http://220.231.119.171/kcntt/(S(oke02btitepkawqhulanly4g))/Home.aspx",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
        }
    );
    const htmlContent = await response.data;
    await page.setContent(htmlContent);
    return await page.evaluate(() => {
        return {
            __VIEWSTATE: document.querySelector("#__VIEWSTATE").value,
            __VIEWSTATEGENERATOR: document.querySelector(
                "#__VIEWSTATEGENERATOR"
            ).value,
            __EVENTVALIDATION:
                document.querySelector("#__EVENTVALIDATION").value,
            drpSemester: document.querySelector("#drpSemester").value,
            hidDiscountFactor:
                document.querySelector("#hidDiscountFactor").value,
            hidReduceTuitionType: document.querySelector(
                "#hidReduceTuitionType"
            ).value,
            hidXetHeSoHocPhiTheoDoiTuong: document.querySelector(
                "#hidXetHeSoHocPhiTheoDoiTuong"
            ).value,
            hidSecondFieldId: document.querySelector("#hidSecondFieldId").value,
            hidSecondAyId: document.querySelector("#hidSecondAyId").value,
            hidSecondFacultyId: document.querySelector("#hidSecondFacultyId")
                .value,
            hidSecondAdminClassId: document.querySelector(
                "#hidSecondAdminClassId"
            ).value,
            hidSecondFieldLevel: document.querySelector("#hidSecondFieldLevel")
                .value,
            drpTerm: document.querySelector("#drpTerm").value,
            hidTuitionFactorMode: document.querySelector(
                "#hidTuitionFactorMode"
            ).value,
            hidLoaiUuTienHeSoHocPhi: document.querySelector(
                "#hidLoaiUuTienHeSoHocPhi"
            ).value,
            hidXetHeSoHocPhiDoiTuongTheoNganh: document.querySelector(
                "#hidXetHeSoHocPhiDoiTuongTheoNganh"
            ).value,
            hidUnitPriceDetail: document.querySelector("#hidUnitPriceDetail")
                .value,
            hidFacultyId: document.querySelector("#hidFacultyId").value,
            hidFieldLevel: document.querySelector("#hidFieldLevel").value,
            hidPrintLocationByCode: document.querySelector(
                "#hidPrintLocationByCode"
            ).value,
            hidUnitPriceKP: document.querySelector("#hidUnitPriceKP").value,
            drpType: document.querySelector("#drpType").value,
            btnView: document.querySelector("#btnView").value,
            hidStudentId: document.querySelector("#hidStudentId").value,
            hidAcademicYearId:
                document.querySelector("#hidAcademicYearId").value,
            hidFieldId: document.querySelector("#hidFieldId").value,
            hidSemester: document.querySelector("#hidSemester").value,
            hidTerm: document.querySelector("#hidTerm").value,
            hidShowTeacher: document.querySelector("#hidShowTeacher").value,
            hidUnitPrice: document.querySelector("#hidUnitPrice").value,
            hidTuitionCalculating: document.querySelector(
                "#hidTuitionCalculating"
            ).value,
            hidTrainingSystemId: document.querySelector("#hidTrainingSystemId")
                .value,
            hidAdminClassId: document.querySelector("#hidAdminClassId").value,
            hidTuitionStudentType: document.querySelector(
                "#hidTuitionStudentType"
            ).value,
            hidStudentTypeId: document.querySelector("#hidStudentTypeId").value,
            hidUntuitionStudentTypeId: document.querySelector(
                "#hidUntuitionStudentTypeId"
            ).value,
            hidUniversityCode:
                document.querySelector("#hidUniversityCode").value,
            txtTuNgay: document.querySelector("#txtTuNgay").value,
            txtDenNgay: document.querySelector("#txtDenNgay").value,
            hidTuanBatDauHK2: document.querySelector("#hidTuanBatDauHK2").value,
            hidSoTietSang: document.querySelector("#hidSoTietSang").value,
            hidSoTietChieu: document.querySelector("#hidSoTietChieu").value,
            hidSoTietToi: document.querySelector("#hidSoTietToi").value,
        };
    });
}
function createStringDataPost(data) {
    return `__EVENTTARGET=${
        data.__EVENTTARGET ? encodeURIComponent(data.__EVENTTARGET) : ""
    }&__EVENTARGUMENT=${
        data.__EVENTARGUMENT ? encodeURIComponent(data.__EVENTARGUMENT) : ""
    }&__LASTFOCUS=${
        data.__LASTFOCUS ? encodeURIComponent(data.__LASTFOCUS) : ""
    }&__VIEWSTATE=${
        data.__VIEWSTATE ? encodeURIComponent(data.__VIEWSTATE) : ""
    } &__VIEWSTATEGENERATOR=${
        data.__VIEWSTATEGENERATOR
            ? encodeURIComponent(data.__VIEWSTATEGENERATOR)
            : ""
    }&__EVENTVALIDATION=${
        data.__EVENTVALIDATION ? encodeURIComponent(data.__EVENTVALIDATION) : ""
    } &PageHeader1%24drpNgonNgu=010527EFBEB84BCA8919321CFD5C3A34&PageHeader1%24hidisNotify=0&PageHeader1%24hidValueNotify=0&drpSemester=${
        data.drpSemester ? encodeURIComponent(data.drpSemester) : ""
    } &drpTerm=${
        data.drpTerm ? encodeURIComponent(data.drpTerm) : ""
    } &hidDiscountFactor=${
        data.hidDiscountFactor ? encodeURIComponent(data.hidDiscountFactor) : ""
    } &hidReduceTuitionType=${
        data.hidReduceTuitionType
            ? encodeURIComponent(data.hidReduceTuitionType)
            : ""
    } &hidXetHeSoHocPhiTheoDoiTuong=${
        data.hidXetHeSoHocPhiTheoDoiTuong
            ? encodeURIComponent(data.hidXetHeSoHocPhiTheoDoiTuong)
            : ""
    } &hidTuitionFactorMode=${
        data.hidTuitionFactorMode
            ? encodeURIComponent(data.hidTuitionFactorMode)
            : ""
    } &hidLoaiUuTienHeSoHocPhi=${
        data.hidLoaiUuTienHeSoHocPhi
            ? encodeURIComponent(data.hidLoaiUuTienHeSoHocPhi)
            : ""
    } &hidSecondFieldId=${
        data.hidSecondFieldId ? encodeURIComponent(data.hidSecondFieldId) : ""
    } &hidSecondAyId=${
        data.hidSecondAyId ? encodeURIComponent(data.hidSecondAyId) : ""
    } &hidSecondFacultyId=${
        data.hidSecondFacultyId
            ? encodeURIComponent(data.hidSecondFacultyId)
            : ""
    } &hidSecondAdminClassId=${
        data.hidSecondAdminClassId
            ? encodeURIComponent(data.hidSecondAdminClassId)
            : ""
    } &hidSecondFieldLevel=${
        data.hidSecondFieldLevel
            ? encodeURIComponent(data.hidSecondFieldLevel)
            : ""
    } &hidXetHeSoHocPhiDoiTuongTheoNganh=${
        data.hidXetHeSoHocPhiDoiTuongTheoNganh
            ? encodeURIComponent(data.hidXetHeSoHocPhiDoiTuongTheoNganh)
            : ""
    } &hidUnitPriceDetail=${
        data.hidUnitPriceDetail
            ? encodeURIComponent(data.hidUnitPriceDetail)
            : ""
    } &hidFacultyId=${
        data.hidFacultyId ? encodeURIComponent(data.hidFacultyId) : ""
    } &hidFieldLevel=${
        data.hidFieldLevel ? encodeURIComponent(data.hidFieldLevel) : ""
    } &hidPrintLocationByCode=${
        data.hidPrintLocationByCode
            ? encodeURIComponent(data.hidPrintLocationByCode)
            : ""
    } &hidUnitPriceKP=${
        data.hidUnitPriceKP ? encodeURIComponent(data.hidUnitPriceKP) : ""
    } &drpType=${
        data.drpType ? encodeURIComponent(data.drpType) : ""
    } &btnView=${encodeURIComponent(
        data.btnView ? encodeURIComponent(data.btnView) : ""
    )} &hidStudentId=${
        data.hidStudentId ? encodeURIComponent(data.hidStudentId) : ""
    } &hidAcademicYearId=${
        data.hidAcademicYearId ? encodeURIComponent(data.hidAcademicYearId) : ""
    } &hidFieldId=${
        data.hidFieldId ? encodeURIComponent(data.hidFieldId) : ""
    } &hidSemester=${
        data.hidSemester ? encodeURIComponent(data.hidSemester) : ""
    } &hidTerm=${
        data.hidTerm ? encodeURIComponent(data.hidTerm) : ""
    } &hidShowTeacher=${
        data.hidShowTeacher ? encodeURIComponent(data.hidShowTeacher) : ""
    } &hidUnitPrice=${
        data.hidUnitPrice ? encodeURIComponent(data.hidUnitPrice) : ""
    } &hidTuitionCalculating=${
        data.hidTuitionCalculating
            ? encodeURIComponent(data.hidTuitionCalculating)
            : ""
    } &hidTrainingSystemId=${
        data.hidTrainingSystemId
            ? encodeURIComponent(data.hidTrainingSystemId)
            : ""
    } &hidAdminClassId=${
        data.hidAdminClassId ? encodeURIComponent(data.hidAdminClassId) : ""
    } &hidTuitionStudentType=${
        data.hidTuitionStudentType
            ? encodeURIComponent(data.hidTuitionStudentType)
            : ""
    } &hidStudentTypeId=${
        data.hidStudentTypeId ? encodeURIComponent(data.hidStudentTypeId) : ""
    } &hidUntuitionStudentTypeId=${
        data.hidUntuitionStudentTypeId
            ? encodeURIComponent(data.hidUntuitionStudentTypeId)
            : ""
    } &hidUniversityCode=${
        data.hidUniversityCode ? encodeURIComponent(data.hidUniversityCode) : ""
    } &txtTuNgay=${
        data.txtTuNgay ? encodeURIComponent(data.txtTuNgay) : ""
    } &txtDenNgay=${
        data.txtDenNgay ? encodeURIComponent(data.txtDenNgay) : ""
    } &hidTuanBatDauHK2=${
        data.hidTuanBatDauHK2 ? encodeURIComponent(data.hidTuanBatDauHK2) : ""
    } &hidSoTietSang=${
        data.hidSoTietSang ? encodeURIComponent(data.hidSoTietSang) : ""
    } &hidSoTietChieu=${
        data.hidSoTietChieu ? encodeURIComponent(data.hidSoTietChieu) : ""
    } &hidSoTietToi=${
        data.hidSoTietToi ? encodeURIComponent(data.hidSoTietToi) : ""
    }`;
}
export default {
    addAccount,
};
