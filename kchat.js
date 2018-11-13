const fs=require('fs')
const http=require('http')
const url=require('url')
const path=require('path')
const mime=require('mime')
const WebSocketServer=require('websocket').server

let httpServer=http.createServer((request,response)=>{
    console.log("new http connection")
    let reqPath=path.join('static/',url.parse(request.url).path)
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
                        response.writeHead(403,{'Content-Type':'text/plain'})
                        response.write('403 Forbidden')
                        response.end()
                    }
                }
            })
        } else {
            response.writeHead(404,{'Content-Type':'text/plain'})
            response.write('404 Not Found')
            response.end()
        }
    })
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
            clients.splice(i,i) // Is this ok?
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
        nickname:null,
        handshake_done:false
    })-1]
}

function SendToAll(obj) {
    for(let i=0;i<clients.length;i++){
        clients[i].conn.sendUTF(JSON.stringify(obj))
    }
}

function SendToOthers(except_conn,obj) {
    for(let i=0;i<clients.length;i++){
        if(clients[i].conn!=except_conn) clients[i].conn.sendUTF(JSON.stringify(obj))
    }
}

function SendToOne(this_conn,obj) {
    this_conn.sendUTF(JSON.stringify(obj))
}

server.on('request',(request)=>{
    try {
        let connection=request.accept('kchat-v1',request.origin)
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
                        if(j.newuser) {
                            SendToAll({type:"message",isSysMsg:true,message:"欢迎新人~!"})
                        } else {
                            thisClient.nickname=j.nickname
                            thisClient.handshake_done=true
                            SendToOne(connection,{type:"message",isSysMsg:true,message:`欢迎回来, ${thisClient.nickname}`})
                            SendToOthers(connection,{type:"message",isSysMsg:true,message:`${thisClient.nickname} 加入了聊天室.`})
                        }
                    }
                } else if(j.type=='operation') {
                    if(!thisClient.handshake_done) {
                        console.warn("Invalid user. Something is wrong")
                        SendToOne(connection,{type:"message",isSysMsg:true,message:"操作失败. 请先登录."})
                    } else {
                        if(j.operation=="nickname_change") {
                            if(thisClient.nickname==null) {
                                thisClient.nickname=j.newname
                                SendToAll({type:"message",isSysMsg:true,message:`${thisClient.nickname} 加入了聊天室.`})
                            } else {
                                let oldname=thisClient.nickname
                                let newname=j.newname
                                thisClient.nickname=newname
                                SendToAll({type:"message",isSysMsg:true,message:`${oldname} 修改了昵称为 ${newname}`})
                            }
                        } else {
                            console.warn("Unknown operation: " + j.operation)
                        }
                    }
                } else if(j.type=='message') {
                    SendToAll({type:"message",isSysMsg:false,sender:thisClient.nickname,message:j.message})
                } else {
                    console.warn("Unknown type: " + j.type)
                }
            } else {
                // Currently, binary data is not supported.
                // If a client send binary data, it will be kicked from chatroom.
                console.log('get binary data. kicking this client...')
                let nickname=thisClient.nickname
                RemoveClientByConn(connection)
                SendToAll({type:"message",isSysMsg:true,message:`${nickname} 被移出聊天室.`})
            }
        })

        connection.on('close',(reasonCode,desc)=>{
            console.log('ws client close ' + reasonCode + ' '+ desc)
            let nickname=thisClient.nickname
            RemoveClientByConn(connection)
            SendToAll({type:"message",isSysMsg:true,message:`${nickname} 离开了.`})
        })
    } catch (e) {
        console.warn("Exception: " + e)
    }
})