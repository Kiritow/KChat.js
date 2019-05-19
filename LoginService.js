const databaseService = require("./DatabaseService").getService()

function IgnorePromise(promise) {
    promise.then(()=>{}).catch((e)=>{
        console.error(`IgnoredPromiseError: ${e}`)
    })
}

class LoginService {
    static getService() {
        if (!LoginService.instance) {
            LoginService.instance = new LoginService()
        }
        return LoginService.instance
    }

    constructor() {

    }

    async login(username, password, connip) {
        user = await databaseService.getUserByName(username)
        if(user == null || user.password != password) {
            throw Error("Incorect username of password.")
        }
        if(user.accountStatus == 0) {
            throw Error("User account is not activated.")
        } else if (user.accountStatus == 2) {
            throw Error("Account is currently banned from login.")
        } else if (user.accountStatus == 3) {
            throw Error("Account is permanently banned from login.")
        }
        IgnorePromise(databaseService.addUserHistory(user.id, 1, connip))
        delete user.password
        return user
    }

    logout(userid, connip) {
        IgnorePromise(databaseService.addUserHistory(userid, 2, connip))
    }

    async register(username, password, nickname, intro, enableNow) {
        if (!username || username.length > 32) {
            throw Error("Invalid username.")
        }
        if (!password || password.length != 64) {
            throw Error("Invalid password.")
        }
        if (!nickname || nickname.length > 128) {
            throw Error("Invalid nickname.")
        }
        if (intro && intro.length > 256) {
            throw Error("Intro too long.")
        }
        try {
            await databaseService.addUser(username, password, nickname, intro || null, enableNow ? 1 : 0)
        } catch (e) {
            console.error(`Failed to register. ${e}`)
            throw Error("Username already exists.")
        }
    }

    async banUserByID(userID, banTime) {
        if (banTime) {
            await databaseService.setAccountStatus(userID, 2)
            await databaseService.addUserBan(userID, banTime)
        } else {
            await databaseService.setAccountStatus(userID, 3)
        }
    }
}

module.exports = LoginService
