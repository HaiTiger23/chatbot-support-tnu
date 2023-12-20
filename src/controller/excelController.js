import XLSX from "xlsx";
import path from "path";
import fs from "fs";
const log = require("log-to-file");

function create(data, name) {
    const excelFilePath = path.join(__dirname, '../../assets/xls/'+name+'.xls');
    if(fs.existsSync(excelFilePath) ) {
        fs.unlinkSync(excelFilePath)
    }
    fs.writeFileSync(excelFilePath, data, 'binary');
    console.log(`File Excel đã được tải về và lưu vào: ${excelFilePath}`);
    return excelFilePath;
}
function read(filepath) {
    const workbook = XLSX.readFile(filepath);
    const sheetNames = workbook.SheetNames;
    // Chọn sheet cần đọc
    const selectedSheetName = sheetNames[0];
    const selectedSheet = workbook.Sheets[selectedSheetName];
    // Đọc dữ liệu từ sheet
    const data = XLSX.utils.sheet_to_json(selectedSheet, { header: 1,
        range: 10 });
    log(JSON.stringify(data));
    // remove(filepath)
    return data;
}
function remove(filepath) {
    if(fs.existsSync(filepath) ) {
        fs.unlinkSync(filepath)
    }
}

export default {
    create,
    read,
    remove
}