function getTime() {
    let date = new Date()
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    let d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    let h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    let minute = date.getMinutes();
    let second = date.getSeconds();
    minute = minute < 10 ? ('0' + minute) : minute;
    second = second < 10 ? ('0' + second) : second;
    return y + '-' + m + '-' + d+' '+h+':'+minute+':'+second;
}

// -------------- 昵称控制 --------------
function saveNickname() {
    console.log("Saving nickname:"+$("#nickname").val())
    $.cookie('this_nickname',escape($("#nickname").val()),{expires:3})
}

function getNickname() {
    let name=$.cookie('this_nickname')
    if(name==null) {
        return null
    } else {
        return unescape(name)
    }
}

$("#change_nickname").click(function(){
    $("#msg").attr("disabled","disabled")
    $("#send_msg").attr("disabled","disabled")
    $("#nickname").removeAttr("disabled")
    $("#change_nickname").attr("hidden","hidden")
    $("#confirm_nickname").removeAttr("hidden")

    $("#change_channel").attr("disabled","disabled")
})

$("#confirm_nickname").click(function(){
    if($("#nickname").val()== null || $("#nickname").val()=='') {
        console.log("请填写昵称!")
        return
    }
    WSSendJSON({type:"operation",operation:"nickname_change",newname:$("#nickname").val()})
    saveNickname($("#nickname").val())
    $("#nickname").attr("disabled","disabled")
    $("#confirm_nickname").attr("hidden","hidden")
    $("#change_nickname").removeAttr("hidden")
    $("#msg").removeAttr("disabled")
    $("#send_msg").removeAttr("disabled")

    $("#change_channel").removeAttr("disabled")
})

// ------------- 聊天消息面板控制 -------------
let max_message_size = 20 // Max message displayed on panel.
let next_message_display_id = 1

function ClearBar() {
    $("#chat_bar").empty()
    $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight;
}

function AppendToBar(msg) {
    $("#chat_bar").append(`<p id="_msg_${next_message_display_id++}"><font color=blue>${getTime()}</font> ${msg}</p>`)
    if(next_message_display_id > max_message_size) {
        // max message size exceed. Remove the first message.
        $(`#_msg_${next_message_display_id - max_message_size}`).remove()
    }
    if ($("#auto_scrolldown").get(0).checked) {
        $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight
    }
}

// ------------ 在线列表控制 --------------
let _xlst={}
function ListAdd(id, name, intro) {
    console.log(`ListAdd ${id} ${name} ${intro}`)

    if (id in _xlst) {
        _xlst[id].count++
        $(`#_utab_${id}`).text(`${name || "Noname"} (${_xlst[id].count})`)
    } else {
        _xlst[id] = {
            name: name,
            intro: intro,
            count: 1
        }

        $("#online_tab").append(`<p id="_utab_${id}"></p>`)
        $(`#_utab_${id}`).text(name || "Noname")
        $(`#_utab_${id}`).on('mouseover', ()=>{
            $(`#_utab_${id}`).text(`>> ${intro}`)
        })
        $(`#_utab_${id}`).on('mouseout', ()=>{
            $(`#_utab_${id}`).text(`${name || "Noname"} (${_xlst[id].count})`)
        })
    }
}

function ListClear() {
    console.log("List clear")
    _xlst={}
    $("#online_tab").empty()
}

function ListDel(id) {
    console.log(`List delete ${id}`)
    if(id in _xlst) {
        if(_xlst[id].count > 1) {
            _xlst[id].count--
        } else {
            $(`#_utab_${id}`).remove()
            delete _xlst[id]
        }
    }
}

// ----------- 旧版本兼容 -------------
function WSSendJSON(j) {
    chatroom.send(j)
}

// Send content of $("#msg").val() to channel $("#channel_name").val()
function WSSendMessage() {
    WSSendJSON({type:"message",message:$("#msg").val(),channel:$("#channel_name").val()})
}


// This is called and reseted on every response.
let operation_callback=()=>{}
let reconnect_timer_id=null
let reconnect_ws_url=`ws://${window.location.host}/websocket`
let reconnect_enabled=true
let chatroom=null
// Forward declaration
let wsConnect=()=>{}

function wsConnectOfficial() {
    reconnect_ws_url="ws://kchat.kiritow.com/websocket"
    wsConnect()
}

function wsConnectDev() {
    reconnect_ws_url="ws://localhost:8001"
    wsConnect()
}

$("#dev_op").click(function(){
    if(reconnect_timer_id!=null) {
        console.log("dev_op switched. clearing timer...")
        clearTimeout(reconnect_timer_id)
        reconnect_timer_id=null
    }

    if($("#dev_op").get(0).checked) {
        $("#status_bar").text("连接开发者模式服务器中...")
        wsConnectDev()
    } else {
        $("#status_bar").text("连接聊天服务器中...")
        wsConnectOfficial()
    }
})

function sendMessage() {
    if($("#nickname").val()== null || $("#nickname").val()=='') {
        console.log("请填写昵称!")
        return
    }

    if(getNickname() == null) {
        $("#nickname").attr("disabled","disabled")
        saveNickname()
        console.log("Sending message:"+ $("#msg").val())
        WSSendJSON({type:"operation",operation:"nickname_change",newname:$("#nickname").val()})
    }

    if($("#code_op").get(0).checked) {
        console.log(`Sending code message (lang: ${$("#code_lang").val()})...`)
        WSSendJSON({type:"message",msgType:"code",codeLang:$("#code_lang").val(),message:$("#msg").val(),channel:$("#channel_name").val()})
    } else {
        console.log("Sending message:"+ $("#msg").val())
        WSSendMessage()
    }
    $("#msg").val('')
}

$("#send_msg").click(function(){
    sendMessage()
})

$("#msg").on('keypress',function(ev){
    if($("#send_on_enter").get(0).checked && ev.keyCode==13) {
        sendMessage()
        return false
    }
})

// ------------- 图片发送 --------------
function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

$("#send_file").on('change', () => {
    let file = $("#send_file").get(0).files[0]
    console.log(file)
    if (file) {
        let file_type = file.type
        let reader = new FileReader()
        reader.onload = function() {
            let buffer = reader.result
            let content = `data:${file_type};base64,${arrayBufferToBase64(buffer)}`
            chatroom.sendImageMessage(content)
        }
        reader.readAsArrayBuffer(file)
    } else {
        console.log("no file selected.")
    }
})

// ------------- 频道切换 ---------------
let old_channel_name=''

$("#change_channel").click(function(){
    old_channel_name=$("#channel_name").val()

    $("#msg").attr("disabled","disabled")
    $("#send_msg").attr("disabled","disabled")
    $("#channel_name").removeAttr("disabled")
    $("#change_nickname").attr("disabled","disabled")

    $("#change_channel").attr("hidden","hidden")
    $("#confirm_channel").removeAttr("hidden")
})

$("#confirm_channel").click(function(){
    $("#channel_name").attr("disabled","disabled")
    $("#confirm_channel").attr("disabled","disabled")

    ClearBar()
    AppendToBar("[kchat] 正在切换至频道: " + $("#channel_name").val())
    operation_callback=(j)=>{
        if(j.success) {
            AppendToBar("[kchat] 频道切换成功")
        } else {
            AppendToBar("[kchat] 频道切换失败. 错误: " + j.reason)
            $("#channel_name").val(old_channel_name)
        }

        $("#msg").removeAttr("disabled")
        $("#send_msg").removeAttr("disabled")
        $("#change_nickname").removeAttr("disabled")
        $("#change_channel").removeAttr("hidden")
        $("#confirm_channel").attr("hidden","hidden")
        $("#confirm_channel").removeAttr("disabled")
    }
    WSSendJSON({type:"operation",operation:"switch_channel",newchannel:$("#channel_name").val()})
})

// ------------- SHA256 ---------------
function getsha256(text) {
    return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(text))
}

// UI Interface
class MyUIInterface extends UIInterface {
    constructor() {
        super()

        this.auto_reconnect=true
        this.reconnect_timer=null
        this.namemap = {}

        $("#login_confirm").click(()=>{
            console.log("login button clicked.")
            this.chatroom.login(
                $("#login_username").val(), 
                getsha256($("#login_password").val())
            )
            console.log("login call finished.")
        })
    }

    onConnected() {
        console.log("onopen")
        $("#status_bar").text("已连接到服务器.")

        console.log("Connected to server. Please login.")
        $("#login_username").removeAttr("disabled")
        $("#login_password").removeAttr("disabled")
        $("#login_panel").removeAttr("hidden")
    }

    // 登录响应处理. data格式: userid, username, nickname, channel
    onLogin(code, data) {
        if(code == 0) {
            console.log(`successfully login. ${code} ${data}`)
            $("#msg").removeAttr("disabled")
            $("#send_msg").removeAttr("disabled")
            $("#change_nickname").removeAttr("disabled")
            $("#change_channel").removeAttr("disabled")

            $("#nickname").val(data.nickname)

            $("#login_panel").attr("hidden", "hidden")
            $("#login_ok_panel_uname").text(data.username)
            $("#login_ok_panel").removeAttr("hidden")
            $("#action_panel").removeAttr("hidden")
        } else {
            console.log(`failed to login. ${code}`)
            $("#login_username").val("")
            $("#login_password").val("")
            console.log("登录失败, 请重新输入用户信息")
        }
    }

    onClose() {
        console.log("onclose")
        $("#status_bar").text("连接已关闭. 5秒后自动重连...")
        if(this.auto_reconnect) {
            console.log('auto reconnect enabled.')
            this.reconnect_timer=setTimeout(()=>{
                console.log("resetting timer inside timer...")
                this.reconnect_timer=null
                $("#status_bar").text("重新连接中...")
                this.chatroom.reset()
            },5000)
            console.log(`reconnect_timer_id: ${reconnect_timer_id}`)
        } else {
            console.log('auto reconnect disabled.')
        }
    }

    onAddUser(userid, nickname, intro) {
        this.namemap[userid] = nickname
        ListAdd(userid, nickname, intro)
    }

    onDelUser(userid) {
        ListDel(userid)
        delete this.namemap[userid]
    }

    onClearOnlineList() {
        ListClear()
    }

    onMessage(message) {
        let j=message
        if(j.type=="message") {
            if(j.isSysMsg) {
                AppendToBar("[系统消息] "+j.message)
            } else if(j.msgType=="code") {
                let codeResult = hljs.highlight(j.codeLang || "plain", j.message, true).value
                codeResult = codeResult.replace(/(\r\n|\n|\r)/gm, "</p><p>");
                AppendToBar(this.namemap[j.sender] + "的代码消息: <p>" + codeResult + "</p>")
            } else if (j.msgType=="image") {
                console.log("Received image message.")
                AppendToBar(this.namemap[j.sender] + ": " + `<img src="${j.message}">`)
            } else {
                AppendToBar(this.namemap[j.sender] + "说: " + j.message)
            }
        } else if(j.type=="response") {
            console.log("Operation response: " + j.success)
            if(!j.success) {
                console.log("Operation failure reason: "+j.reason)
            }

            operation_callback(j)
            operation_callback=()=>{}
        } else {
            console.log("Unknown message type: " + j.type)
        }
    }
}

// onPageLoaded.
wsConnect = ()=>{
    console.log(`Connect to server: ${reconnect_ws_url}`)
    console.log(reconnect_ws_url)
    chatroom = new ChatRoom(reconnect_ws_url, new MyUIInterface())
}

window.onload = function () {
    wsConnect()
}
