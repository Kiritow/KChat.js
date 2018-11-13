const fs=require('fs')
const http=require('http')
const url=require('url')
const path=require('path')
const mime=require('mime')
const querystring=require('querystring')

const WebSocketServer=require('websocket').server
const UserInfoProvider=require('./dao.js')

// Log goes to kchat_server.log
let log4js=require('log4js')
log4js.configure({
    appenders:{
        kchat_server: {
            type:'file',
            filename:'kchat_server.log'
        }
    },
    categories: {
        default: {
            appenders: ['kchat_server'],
            level:"info"
        }
    }
})
const logger=log4js.getLogger('kchat_server')

function RequestHandler(request,response,reqPath) {
    console.log('request path: ' + reqPath)
    fs.exists(reqPath,(exists)=>{
        if(exists){
            fs.stat(reqPath,(err,stats)=>{
                if(err) {
                    response.writeHead(500,{'Content-Type':'text/plain'})
                    response.write('500 Server Internal Error')
                    response.end()
                } else {
                    if(stats.isFile()) {
                        // well... mime 2 has a breaking change here: mime.lookup() is renamed to mime.getType()
                        response.writeHead(200,{'Content-Type':mime.getType(reqPath)})
                        fs.createReadStream(reqPath).pipe(response)
                    } else {
                        // redirect to index.html
                        RequestHandler(request,response,path.join(reqPath,"index.html"))
                    }
                }
            })
        } else {
            response.writeHead(404,{'Content-Type':'text/plain'})
            response.write('404 Not Found')
            response.end()
        }
    })
}

let httpServer=http.createServer((request,response)=>{
    console.log("new http connection: " + request.url)
    let urlinfo=url.parse(request.url)
    if(urlinfo.path=='/doLogin') {
        if(request.method!='POST') {
            response.writeHead(405,"Please use POST method",{"Content-Type":"text/plain"})
            response.end()
        } else {
            let data=''
            request.on('data',(chunk)=>{
                data+=chunk
            })
            request.on('end',()=>{
                let post=querystring.parse(data)
                
                // TODO
                response.writeHead(501,"Sorry, still WIP...",{"Content-Type":"text/plain"})
                response.end()
            })
        }
    } else {
        let reqPath=path.join('static',path.normalize(urlinfo.pathname))
        RequestHandler(request,response,reqPath)
    }
})

// This is the server port.
// This port should not be exposed to clients.
httpServer.listen(8001)

let server=new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: false
})

// Array? emmm... may have performance issues.
let clients=new Array()

function RemoveClientByConn(conn) {
    for(let i=0;i<clients.length;i++) {
        if(clients[i].conn==conn) {
            console.log("Connection found in list. Removing...")
            clients[i].conn.close()
            clients.splice(i,1) // Is this ok?
            return true
        }
    }
    console.log("Connection not in list. ")
    return false
}

function GetClientByConn(conn) {
    for(let i=0;i<clients.length;i++) {
        if(clients[i].conn==conn) {
            return clients[i]
        }
    }
    return null
}

function AddNewClient(conn) {
    return clients[clients.push({
        conn:conn,
        ip:conn.socket.remoteAddress,
        nickname:null,
        channel:'main',
        handshake_done:false
    })-1]
}

function GlobalSendToAll(obj) {
    for(let i=0;i<clients.length;i++){
        clients[i].conn.sendUTF(JSON.stringify(obj))
    }
}

function SendToAll(channel,obj) {
    if(!obj.channel) obj.channel=channel
    for(let i=0;i<clients.length;i++){
        if(clients[i].channel==channel) {
            clients[i].conn.sendUTF(JSON.stringify(obj))
        }
    }
}

function SendToOthers(channel,except_conn,obj) {
    if(!obj.channel) obj.channel=channel
    for(let i=0;i<clients.length;i++){
        if(clients[i].channel==channel && clients[i].conn!=except_conn) {
            clients[i].conn.sendUTF(JSON.stringify(obj))
        }
    }
}

function SendToOne(this_conn,obj) {
    this_conn.sendUTF(JSON.stringify(obj))
}

function SendOnlineListToOne(channel,conn) {
    conn.sendUTF(JSON.stringify({type:"command",command:"list_clear"}))
    let temp=new Array()
    for(let i=0;i<clients.length;i++) {
        if(clients[i].channel==channel) {
            temp.push(clients[i].nickname) // null will be pushed. will be handled in browser.
        }
    }
    console.log(`Channel ${channel} has ${temp.length} values.`)
    conn.sendUTF(JSON.stringify({type:"command",command:"list_fill",val:temp}))
}

function CheckMessage(msg) {
    msg=msg.replace(/</g,'&lt')
    return msg.replace(/>/g,'&gt')
}

server.on('request',(request)=>{
    try {
        let connection=request.accept('kchat-v1c',request.origin)
        console.log('Websocket connection accepted.')
        let thisClient=AddNewClient(connection)

        connection.on('message',(message)=>{
            if(message.type=='utf8') {
                let j=JSON.parse(message.utf8Data)

                if(j.type=='handshake') {
                    if(thisClient.handshake_done) {
                        console.warn("Double handshake. Something is wrong")
                        SendToOne(connection,{type:"message",isSysMsg:true,message:"您已登录. 请勿重新登录"})
                    } else {
                        thisClient.handshake_done=true
                        thisClient.channel=j.channel
                        
                        if(j.newuser) {
                            SendToAll(thisClient.channel,{type:"message",isSysMsg:true,message:"欢迎新人~!"})
                            SendToOne(connection,{type:"message",isSysMsg:true,message:"欢迎加入聊天室. 请先完善您的个人资料(昵称)后再发言."})
                        } else {
                            thisClient.nickname=CheckMessage(j.nickname)
                            SendToOne(connection,{type:"message",isSysMsg:true,message:`欢迎回来, ${thisClient.nickname}`})
                            SendToOthers(thisClient.channel,connection,{type:"message",isSysMsg:true,message:`${thisClient.nickname} 加入了频道 ${thisClient.channel}.`})
                            // Update Online list
                            SendToOthers(thisClient.channel,connection,{type:"command",command:"list_add",val:thisClient.nickname})
                        }

                        SendOnlineListToOne(thisClient.channel,connection)
                    }
                } else if(j.type=='operation') {
                    if(!thisClient.handshake_done) {
                        console.warn("Invalid user. Something is wrong")
                        SendToOne(connection,{type:"message",isSysMsg:true,message:"操作失败. 请先登录."})
                        SendToOne(connection,{type:"response",success:false,reason:"handshake required."})
                    } else {
                        if(j.operation=="nickname_change") {
                            if(thisClient.nickname==null) {
                                thisClient.nickname=CheckMessage(j.newname)
                                SendToAll(thisClient.channel,{type:"message",isSysMsg:true,message:` [New] ${thisClient.nickname} 加入了频道 ${thisClient.channel}.`})
                                // Update online list
                                SendToAll(thisClient.channel,{type:"command",command:"list_add",val:thisClient.nickname})
                            } else {
                                let oldname=thisClient.nickname
                                let newname=CheckMessage(j.newname)
                                thisClient.nickname=newname
                                SendToAll(thisClient.channel,{type:"message",isSysMsg:true,message:`${oldname} 修改了昵称为 ${newname}`})
                                // Update online list
                                SendToAll(thisClient.channel,{type:"command",command:"list_replace",oldval:oldname,newval:newname})
                            }

                            SendToOne(connection,{type:"response",success:true})
                        } else if(j.operation=="switch_channel") {
                            // FIXME: channel is not validated here.
                            let oldchannel=thisClient.channel
                            thisClient.channel=CheckMessage(j.newchannel)
                            SendToAll(oldchannel,{type:"message",isSysMsg:true,message:`${thisClient.nickname} 切换了频道.`})
                            // Update old channel list
                            SendToAll(oldchannel,{type:"command",command:"list_del",val:thisClient.nickname})
                            // Update new channel list
                            SendOnlineListToOne(thisClient.channel,connection)
                        } else {
                            console.warn("Unknown operation: " + j.operation)
                            SendToOne(connection,{type:"response",success:false,reason:"Unknown operation"})
                        }
                    }
                } else if(j.type=='message') {
                    if(!thisClient.handshake_done) {
                        console.warn("Invalid user. Something is wrong")
                        SendToOne(connection,{type:"message",isSysMsg:true,message:"发送消息失败. 请先登录."})
                    } else if(thisClient.nickname==null) {
                        console.warn("Send message before nickname filled.")
                        SendToOne(connection,{type:"message",isSysMsg:true,message:"请先完善您的个人资料(昵称)后再发言."})
                    } else {
                        // Something wrong with log4js? logger.log() is useless, and logger.info() is the right one.
                        logger.info(`Channel: ${thisClient.channel}. Sender: ${thisClient.nickname}(${thisClient.ip}). Raw Message: ${j.message}`)
                        SendToAll(thisClient.channel,{type:"message",isSysMsg:false,sender:thisClient.nickname,message:CheckMessage(j.message)})
                    }
                } else {
                    console.warn("Unknown type: " + j.type)
                }
            } else {
                // Currently, binary data is not supported.
                // If a client send binary data, it will be kicked from chatroom.
                console.log('get binary data. kicking this client...')
                let nickname=thisClient.nickname
                RemoveClientByConn(connection)
                SendToAll(thisClient.channel,{type:"message",isSysMsg:true,message:`${nickname} 被移出聊天室.`})
            }
        })

        connection.on('close',(reasonCode,desc)=>{
            console.log('ws client close. ' + reasonCode + '. '+ desc)
            let nickname=thisClient.nickname
            RemoveClientByConn(connection)
            SendToAll(thisClient.channel,{type:"message",isSysMsg:true,message:`${nickname} 离开了.`})
            // Update online list
            SendToAll(thisClient.channel,{type:"command",command:"list_del",val:nickname})
        })
    } catch (e) {
        console.warn("Exception: " + e)
    }
})