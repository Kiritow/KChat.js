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

    onClearOnlineList() {

    }

    onFlushOnlineList(onlineList) {

    }
}

class ChatRoom {
    constructor(serverIP, uiInterface) {
        console.log(`ChatRoom initialized with ${serverIP}, ${uiInterface}`)
        console.log(uiInterface)
        this.serverIP = serverIP
        this.uiInterface = uiInterface
        uiInterface.chatroom = this

        this.reset()
    }

    reset() {
        this.islogin = false
        this.userid = null
        this.username = null
        this.nickname = null
        this.channel = null

        try {
            // If this function is called in onclose, avoid twice call.
            this.ws.onclose=null
        } catch (e) {
            console.log(e)
        }

        this.ws = new WebSocket(this.serverIP, "kchat-v2")
        // Use bind to avoid undefined.
        this.ws.onopen = this.handleOpen.bind(this)
        this.ws.onmessage = this.handleMessage.bind(this)
        this.ws.onclose = this.handleClose.bind(this)
    }

    handleOpen() {
        try {
            this.uiInterface.onConnected()
        } catch (e) {
            console.log(e)
        }
    }

    handleClose() {
        try {
            this.uiInterface.onClose()
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
                } else if (j.command == "list_clear") {
                    this.uiInterface.onClearOnlineList()
                } else {
                    console.log(`Unknown command: ${j.command}`)
                }
            } else if(j.type == "response") {
                if (j.action == "login") {
                    this.uiInterface.onLogin(j.code, j.code == 0 ? j.data : j.err)
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
