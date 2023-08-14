const addAccount = function(message,user) {
    try {
        let [SvID, password] = message.split('|');
        SvID = SvID.trim()
        password = SvID.trim()
        return {
            text:   "SVID: " + SvID + "\n" +
                    "Password: " + password
        }
    } catch (e) {
        console.log(e);
        return {
            text:  "Lỗi thử lại sau..."
        }
    }
   
}

export default {
    addAccount
}