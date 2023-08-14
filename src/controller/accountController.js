const addAccount = function(message,user) {
    let {SvID, password} = message.split('|');
    return {
        text:   "SVID: " + SvID + "\n" +
                "Password: " + password
    }
}

export default {
    addAccount
}