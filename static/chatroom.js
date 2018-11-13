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

function ClearBar() {
    $("#chat_bar").empty()
    $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight;
}

function AppendToBar(msg) {
    $("#chat_bar").append("<p><font color=blue>"+getTime()+"</font> "+msg+"</p>")
    $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight;
}

let _xlst=new Array()
function ListAdd(name) {
    _xlst.push(name)
    if(name!=null) {
        $("#online_tab").append("<p>"+name+"</p>")
    } else {
        $("#online_tab").append("<p>&ltNoname&gt</p>")
    }
}

function ListClear() {
    _xlst=new Array()
    $("#online_tab").empty()
}

function ListDel(name) {
    let idx=_xlst.indexOf(name)
    if(idx!=-1) {
        _xlst.splice(idx,1)
        $("#online_tab").empty()
        $.each(_xlst,function(idx,name){
            if(name!=null) {
                $("#online_tab").append("<p>"+name+"</p>")
            } else {
                $("#online_tab").append("<p>&ltNoname&gt</p>")
            }
        })
    }
}

function WSSendJSON(ws,j) {
    ws.send(JSON.stringify(j))
}

// Send content of $("#msg").val() to channel $("#channel_name").val()
function WSSendMessage(ws) {
    WSSendJSON(ws,{type:"message",message:$("#msg").val(),channel:$("#channel_name").val()})
}


// This is called and reseted on every response.
let operation_callback=()=>{}
let reconnect_timer_id=null
let reconnect_ws_url="ws://kchat.kiritow.com/websocket"
let reconnect_ws_version='kchat-v1c'
let ws=null
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

function bindCallback(ws) {
    ws.onopen=function() {
        console.log("onopen")
        $("#status_bar").text("已连接到服务器.")

        console.log("Handshake starts")
        if(getNickname()==null) {
            WSSendJSON(ws,{type:"handshake",channel:$("#channel_name").val(),newuser:true})
            $("#nickname").removeAttr("disabled")
        } else {
            WSSendJSON(ws,{type:"handshake",channel:$("#channel_name").val(),newuser:false,nickname:getNickname()})
            $("#nickname").val(getNickname())
        }
        console.log("Handshake sent.")

        $("#msg").removeAttr("disabled")
        $("#send_msg").removeAttr("disabled")
        $("#change_nickname").removeAttr("disabled")
        $("#change_channel").removeAttr("disabled")
    }
    ws.onclose=function(){
        console.log("onclose")
        $("#status_bar").text("连接已关闭. 5秒后自动重连...")
        reconnect_timer_id=setTimeout(()=>{
            $("#status_bar").text("重新连接中...")
            wsConnect()
        },5000)
    }
    ws.onerror=function() {
        console.log("onerror")
        $("#status_bar").text("发生错误.")
    }
    ws.onmessage=function(ev) {
        let j=JSON.parse(ev.data)
        if(j.type=="command"){
            console.log("Received command : "+j.command)
            if(j.command=="list_clear"){
                ListClear()
            } else if(j.command=="list_add") {
                ListAdd(j.val)
            } else if(j.command=="list_fill") {
                for(let i=0;i<j.val.length;i++) {
                    ListAdd(j.val[i])
                }
            } else if(j.command=="list_del") {
                ListDel(j.val)
            } else if(j.command=="list_replace") {
                ListDel(j.oldval)
                ListAdd(j.newval)
            } else {
                console.log("Unknown command: " + command)
            }
        } else if(j.type=="message") {
            if(j.isSysMsg) {
                AppendToBar("[系统消息] "+j.message)
            } else {
                AppendToBar(j.sender + "说: " + j.message)
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

wsConnect = ()=>{
    if(reconnect_timer_id!=null) {
        clearTimeout(reconnect_timer_id)
        reconnect_timer_id=null
    }
    
    if(ws!=null) {
        ws.close()
    }
    ws=new WebSocket(reconnect_ws_url,reconnect_ws_version)
    bindCallback(ws)
}

$("#dev_op").click(function(){
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
        alert("请填写昵称!")
        return
    }
    if(getNickname()==null) {
        $("#nickname").attr("disabled","disabled")
        saveNickname()
        console.log("Sending message:"+ $("#msg").val())
        SendJSON({type:"operation",operation:"nickname_change",newname:$("#nickname").val()})
        WSSendMessage(ws)
    } else {
        console.log("Sending message:"+ $("#msg").val())
        WSSendMessage(ws)
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

$("#change_nickname").click(function(){
    $("#msg").attr("disabled","disabled")
    $("#send_msg").attr("disabled","disabled")
    $("#nickname").removeAttr("disabled")
    $("#change_nickname").attr("hidden","hidden")
    $("#confirm_nickname").removeAttr("hidden")
})

$("#confirm_nickname").click(function(){
    if($("#nickname").val()== null || $("#nickname").val()=='') {
        alert("请填写昵称!")
        return
    }
    WSSendJSON(ws,{type:"operation",operation:"nickname_change",newname:$("#nickname").val()})
    saveNickname($("#nickname").val())
    $("#nickname").attr("disabled","disabled")
    $("#confirm_nickname").attr("hidden","hidden")
    $("#change_nickname").removeAttr("hidden")
    $("#msg").removeAttr("disabled")
    $("#send_msg").removeAttr("disabled")
})

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
    WSSendJSON(ws,{type:"operation",operation:"switch_channel",newchannel:$("#channel_name").val()})
})

wsConnectOfficial()