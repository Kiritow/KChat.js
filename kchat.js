const fs=require('fs')
const http=require('http')
const url=require('url')
const path=require('path')
const mime=require('mime')
const querystring=require('querystring')

const WebSocketServer=require('websocket').server
const chatService=require('./ChatService').getService()
const loginService=require('./LoginService').getService()
const logger = require("./LogService").getService()


function StaticHandler(request,response,reqPath) {
    logger.log('request path: ' + reqPath)
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
                        StaticHandler(request,response,path.join(reqPath,"index.html"))
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
    logger.log("new http connection: " + request.url)
    let urlinfo=url.parse(request.url)
    if(urlinfo.path=='/api/register') {
        if(request.method!='POST') {
            info = {
                "code": -405,
                "error": "Use POST method."
            }
            response.writeHead(200,JSON.stringify(info),{"Content-Type":"application/json"})
            response.end()
        } else {
            let data=''
            request.on('data',(chunk)=>{
                data+=chunk
            })
            request.on('end',async ()=>{
                let info = null
                try {
                    data = JSON.parse(data)
                    await loginService.register(data.username, data.password, data.nickname, data.intro, true)
                    info = {
                        "code": 0,
                        "error": "success"
                    }
                } catch (e) {
                    info = {
                        "code": -1,
                        "error": `Failed to register. ${e}`
                    }
                }

                response.writeHead(200,JSON.stringify(info),{"Content-Type":"text/plain"})
                response.end()
            })
        }
    } else {
        let reqPath=path.join('static',path.normalize(urlinfo.pathname))
        StaticHandler(request,response,reqPath)
    }
})

// This is the server port.
// This port should not be exposed to clients.
httpServer.listen(8001)

let wsServer=new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: false,
    maxReceivedFrameSize: 50 * 1024 * 1024, // 50MB
    maxReceivedMessageSize: 50 * 1024 * 1024 // 50MB
})

wsServer.on('request', (request)=> {
    try {
        let conn = request.accept('kchat-v2',request.origin)
        logger.log('Websocket connection accepted.')
        chatService.handleNewConnection(conn)
    } catch (e) {
        logger.error("Failed to accept websocket connection: " + e)
    }
})
