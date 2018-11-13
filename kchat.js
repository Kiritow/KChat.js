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

server.on('request',(request)=>{
    let connection=request.accept('kchat-v1',request.origin)
    console.log('Connection accepted')
    connection.on('message',(message)=>{
        if(message.type=='utf8') {
            console.log('Receive message: '+message.utf8Data)
            connection.sendUTF(message.utf8Data)
        } else {
            console.log('get binary data')
        }
    })
    connection.on('close',(reasonCode,desc)=>{
        console.log('ws client close ' + reasonCode + ' '+ desc)
    })
})