class UIInterface {
    constructor () {

    }

    onConnected() {

    }

    onMessage(message) {

    }

    onAddUser(userid, nickname) {
    
    }

    onDelUser(userid) {

    }

    onFlushOnlineList(onlineList) {

    }
}

class ChatRoom {
    constructor(serverIP, interface) {
        this.serverIP = serverIP
        this.interface = interface

        this.islogin = false
        this.userid = null
        this.username = null
        this.nickname = null
        this.channel = null

        this.ws = new WebSocket(this.serverIP, "kchat-v2")
        this.ws.onopen = this.handleOpen
        this.ws.onmessage = this.handleMessage
    }

    handleOpen() {
        try {
            this.interface.onConnected()
        } catch (e) {
            console.log(e)
        }
    }

    handleMessage(ev) {
        try {
            let j = JSON.parse(ev.data)
            if (j.type == "message") {
                this.interface.onMessage(j)
            } else if (j.type == "command") {
                if (j.command == "list_del") {
                    this.interface.onDelUser(j.uid)
                } else if (j.command == "list_add") {
                    this.interface.onAddUser(j.uid, j.nickname)
                }
            } else {
                console.log(`Unknown message type: ${j.type}`)
            }
        } catch (e) {
            console.log(e)
        }
    }

    send(obj) {
        this.ws.send(JSON.stringify(obj))
    }

    login(username, password) {
        return new Promise((resolve, reject)=>{
            if(password.length != 64) {
                return reject("Invalid password length.")
            }
            this.send({
                type: "login",
                username: username,
                password: password
            })
        })
    }

    sendMessage(message) {
        this.send({
            type: "message",
            message: message,
            sendTime: new Date()
        })
    }

    sendCodeMessage(code, language) {
        this.send({
            type: "message",
            message: code,
            sendTime: new Date(),
            msgType: "code",
            codeLang: language
        })
    }
}
