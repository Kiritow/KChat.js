class UIInterface {
    constructor () {

    }

    onConnected() {

    }

    onClose() {
        
    }

    onLogin(code, data) {

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
    constructor(serverIP, uiInterface) {
        this.serverIP = serverIP
        this.uiInterface = uiInterface

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
            this.uiInterface.onConnected()
        } catch (e) {
            console.log(e)
        }
    }

    handleMessage(ev) {
        try {
            let j = JSON.parse(ev.data)
            if (j.type == "message") {
                this.uiInterface.onMessage(j)
            } else if (j.type == "command") {
                if (j.command == "list_del") {
                    this.uiInterface.onDelUser(j.uid)
                } else if (j.command == "list_add") {
                    this.uiInterface.onAddUser(j.uid, j.nickname)
                }
            } else if(j.type == "response") {
                if (j.action == "login") {
                    this.onLogin(j.code, j.code == 0 ? j.data : j.err)
                } else {
                    console.log(`Unknown response action: ${j.action}`)
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
        if(password.length != 64) {
            throw Error("Invalid password length.")
        }
        this.send({
            type: "login",
            username: username,
            password: password
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
