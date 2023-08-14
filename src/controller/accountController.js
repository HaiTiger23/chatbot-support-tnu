const addAccount = function(message,user) {
    let {SvID, password} = message.split('|');
        SvID = SvID.trim()
        password = SvID.trim()
    return {
        text:   "SVID: " + SvID + "\n" +
                "Password: " + password
    }
}

export default {
    addAccount
}