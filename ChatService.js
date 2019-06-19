const databaseService = require("./DatabaseService").getService()
const logger = require("./LogService").getService()
const TaskRunner = require('./TaskRunner')
const Client = require('./Client')

function IgnorePromise(promise) {
    promise.then(()=>{}).catch((e)=>{
        logger.error(`IgnoredPromiseError: ${e}`)
    })
}

class ChatService {
    static getService() {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService()
        }
        return ChatService.instance
    }

    constructor() {
        this.connQueue = []
        this.onlineQueue = []
        this.channels = {}
        this.ipBlackList = {}

        this.ipCleanRunner = new TaskRunner((blackList) => {
            for (ip in blackList) {
                if (blackList[ip] < new Date()) {
                    logger.log(`IPCleanRunner: Removed IP ${ip} from blacklist.`)
                    delete blackList[ip]
                }
            }
        }, 60000, -1, this.ipBlackList)
    }

    banIP(ip) {
        logger.log(`Adding IP: ${ip} to blacklist...`)
        this.ipBlackList[ip] = new Date() + 30 * 60 * 1000  // 30min
    }

    addClientToChannel(client, channel) {
        if (!this.channels[channel]) {
            this.channels[channel] = new Array()
        }
        this.channels[channel].push(client)
    }

    removeClientFromChannel(client, channel) {
        let channelClients = this.channels[channel]
        if (!channelClients) return
        for (let i=0; i<channelClients.length; i++) {
            if (client == channelClients[i]) {
                console.log(`Remove client ${client.userid} from channel ${channel}`)
                channelClients.splice(i, 1)
                break
            }
        }
        if (channelClients.length < 1) {
            console.log(`Deleting channel: ${channel}`)
            delete this.channels[channel]
        }
    }

    sendToChannel(channel, obj) {
        let clients = this.channels[channel]
        if (!clients) return
        for (let i=0; i<clients.length; i++) {
            clients[i].send(obj)
        }
    }

    sendManyToChannel(channel, objs) {
        let clients = this.channels[channel]
        if (!clients) return
        for (let i=0; i<clients.length; i++) {
            for (let j=0; j<objs.length; j++) {
                clients[i].send(objs[j])
            }
        }
    }

    handleNewConnection(conn) {
        logger.log(`New connection from ${conn.socket.remoteAddress}`)
        if (conn.socket.remoteAddress in this.ipBlackList) {
            conn.close()
            logger.log(`Disconnect due to IP in blacklist: ${conn.socket.remoteAddress}`)
            return
        }
        this.connQueue.push(new Client(conn, this))
    }

    // 当登录成功后转移状态
    onLogin(client) {
        for(let i=0; i<this.connQueue.length;i++) {
            if (client == this.connQueue[i]) {
                this.connQueue.splice(i, 1)
                this.onlineQueue.push(client)
                return
            }
        }

        throw Error("Invalid client.")
    }

    onClose(client, reason) {
        for(let i=0; i<this.onlineQueue.length; i++) {
            if (client == this.onlineQueue[i]) {
                this.onlineQueue.splice(i, 1)
                break
            }
        }

        let leaveMessage = null
        if (reason) {
            leaveMessage = `${client.nickname} 已从服务器断开链接: ${reason}`
        } else {
            leaveMessage = `${client.nickname} 离开了.`
        }

        this.sendManyToChannel(client.channel, [
            {
                type: "message",
                isSysMsg: true,
                message: leaveMessage
            }, {
                type: "command",
                command: "list_del",
                uid: client.userid
            }
        ])
    }

    onMessage(message) {
        IgnorePromise(databaseService.addChatRecord(
            message.sender,
            message.channel,
            message.message.toString()
        ))
        this.sendToChannel(message.channel, message)
    }

    onSwitchChannel(client, toChannel) {
        if (toChannel.startsWith('_')) {
            throw Error("Cannot switch channel.")
        }

        // 通知源频道
        let fromChannel = client.channel
        this.removeClientFromChannel(client, fromChannel)
        this.sendManyToChannel(fromChannel, [
            {
                type: "message",
                isSysMsg: true,
                message: `${client.nickname} 切换了频道.`
            },
            {
                type: "command",
                command: "list_del",
                uid: client.userid
            }
        ])

        // 更新这个客户端的在线列表
        client.send({
            type: "command",
            command: "list_clear",
        })
        let channelClients = this.channels[toChannel]
        if (channelClients) {
            for (let i=0; i<channelClients.length; i++) {
                client.send({
                    type: "command",
                    command: "list_add",
                    uid: channelClients[i].userid,
                    nickname: channelClients[i].nickname,
                    intro: channelClients[i].intro
                })
            }
        }

        // 将客户端加入到目标频道, 通知.
        this.addClientToChannel(client, toChannel)
        this.sendManyToChannel(toChannel, [
            {
                type: "message",
                isSysMsg: true,
                message: `${client.nickname} 加入了频道.`
            },
            {
                type: "command",
                command: "list_add",
                uid: client.userid,
                nickname: client.nickname,
                intro: client.intro
            }
        ])

        logger.info(`Client ${client.userid} switched from ${fromChannel} to ${toChannel}`)
    }
}

module.exports = ChatService
