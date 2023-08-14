class userInteracting {
    constructor(psid) {
        this.psid = psid;
        this.step = 0;
        this.timeStart = Date.now();
    }
}
const addUser = (ListUser, psid) => {
    const user = ListUser.find(e => e.psid === psid);
    if(user) {
        user.step = 0;
        user.timeStart = Date.now();
        return user;
    }
    let newUser = new userInteracting(psid);
    ListUser.push(newUser);
    return newUser;
}
const updateUser = (ListUser, user) => {
    for (let index = 0; index < ListUser.length; index++) {
        const element = ListUser[index];
        if(element.psid === user.psid ) { 
            ListUser[index] = user;
            break;
        }
    }
}
const deleteUser = (ListUser, psid) => {
    ListUser = ListUser.filter(e => e.psid !== psid)
}

export default {
    userInteracting,
    addUser,
    deleteUser,
    updateUser

};