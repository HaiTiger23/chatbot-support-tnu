const addAccount = function(message,user) {
    const {SvID, password} = message.splice('|');
    return {
        text:   "SVID: " + SvID + "\n" +
                "Password: " + password
    }
}

export default {
    addAccount
}