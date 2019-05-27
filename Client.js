const loginService = require("./LoginService").getService()
const logger = require("./LogService").getService()



function IgnorePromise(promise) {
    promise.then(()=>{}).catch((e)=>{
        logger.error(`IgnoredPromiseError: ${e}`)
    })
}


class Client {
    constructor(wsconn, chatService) {
        this.conn = wsconn
        this.islogin = false
        this.nickname = null
        this.userid = null
        this.username = null
        this.channel = "guest"
        this.lastRequestTime = new Date()
        this.requestCount = 0
        this.exceedTime = 0
        this.chatService = chatService

        this.markAsClose = false

        this.conn.on('message', this.handleMessageGate)
        this.conn.on('close', (reasonCode, desc) => {
            if (this.markAsClose) {
                logger.log(`Websocket marked as closed. ${reasonCode}: ${desc}`)
            } else {
                if (this.islogin) {
                    this.chatService.onClose(this)
                    loginService.logout(this.userid, this.conn.ip)
                }
                logger.log(`Websocket without mark closed. ${reasonCode}: ${desc}`)
            }
        })
    }

    close(reason) {
        this.markAsClose = true
        if (this.islogin) {
            this.chatService.onClose(this, reason)
            loginService.logout(this.userid, this.conn.ip)
        }
        this.conn.close()
    }

    send(obj) {
        this.conn.sendUTF(JSON.stringify(obj))
    }

    sendSysMessage(msg) {
        this.send({
            type: "message",
            isSysMsg: true,
            message: msg
        })
    }

    sendResponse(action, code, data) {
        if (code != 0) {
            this.send({
                type: "response",
                action: action,
                code: code,
                err: data
            })
        } else {
            this.send({
                type: "response",
                action: action,
                code: code,
                err: "success",
                data: data
            })
        }
    }

    handleMessageGate(message) {
        now = new Date()
        if(now - this.lastRequestTime <= 1000) {
            if ( ++this.requestCount > 5 ) {
                if ( ++ this.exceedTime > 3 ) {
                    logger.log("Client kicked because of too many exceed times.")
                    if (this.userid) {
                        IgnorePromise(loginService.banUserByID(this.userid))
                    }
                    this.chatService.banIP(this.conn.ip)
                    this.close("Kicked due to sending message too frequently.")
                    return
                }
                this.sendSysMessage("You are sending message too frequently. Slow it please.")
            }
            this.lastRequestTime = now
            return handleMessage(message)
        } else {
            this.requestCount = 1
            this.lastRequestTime = now
            return handleMessage(message)
        }
    }

    async handleMessage(message) {
        if(message.type == 'utf8') {
            let j =JSON.parse(message.utf8Data)

            if(j.type == "handshake") {
                this.sendSysMessage("Handshake is no longer supported. Use login service instead.")
                this.sendResponse("login", -100, "Handshake protocol outdated.")
                this.close()
                return
            } else if (j.type == "login") {
                if (j.username == null || j.password == null) {
                    this.sendResponse("login", -1, "invalid username or password")
                    this.close()
                    return
                }

                try {
                    user = await loginService.login(j.username, j.password, this.conn.ip)
                    this.userid = user.userid
                    this.username = user.username
                    this.nickname = user.nickname
                    this.chatService.onLogin(this)
                    this.islogin = true
                    this.chatService.onSwitchChannel(this, "main")
                    this.channel = "main"
                    logger.log(`${this.username} login success.`)
                    this.sendResponse("login", 0, {
                        userid: this.userid,
                        username: this.username,
                        nickname: this.nickname,
                        channel: this.channel
                    })
                } catch (e) {
                    logger.log(`${j.usernme} login failed: ${e.message}`)
                    this.sendResponse("login", -2, "login error.")
                    this.close()
                    return
                }
            } else if (j.type == "message") {
                if (!this.islogin) {
                    this.sendSysMessage(`Please login first.`)
                    this.sendResponse("message", -1, "cannot send before login.")
                    return
                }
                j.sender = this.userid
                j.nickname = this.nickname
                j.channel = this.channel
                j.isSysMsg = false
                this.chatService.onMessage(j)
            } else {
                logger.warn("Unknown package type: " + j.type)
            }
        } else {
            logger.log("Getting binary data from client. Kicking...")
            this.close()
            return
        }
    }
}

module.exports = Client
