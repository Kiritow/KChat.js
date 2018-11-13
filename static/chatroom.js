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

let _xlst=new Array()
function ListAdd(name) {
    _xlst.push(name)
    $("#online_tab").append("<p>"+name+"</p>")
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
            $("#online_tab").append("<p>"+name+"</p>")
        })
    }
}

function bindCallback(ws) {
    ws.onopen=function() {
        console.log("onopen")
        $("#status_bar").text("已连接到服务器.")
        console.log("Handshake starts")
        if(getNickname()==null) {
            ws.send(JSON.stringify({type:"handshake",newuser:true}))
            $("#nickname").removeAttr("disabled")
        } else {
            ws.send(JSON.stringify({type:"handshake",newuser:false,nickname:getNickname()}))
            $("#nickname").val(getNickname())
        }
        console.log("Handshake sent. waiting for response...")
    }
    ws.onclose=function(){
        console.log("onclose")
        $("#status_bar").text("连接已关闭.")
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
            } else if(j.command=="list_del") {
                ListDel(j.val)
            } else {
                console.log("Unknown command: " + command)
            }
        } else if(j.type=="message") {
            if(j.isSysMsg) {
                $("#chat_bar").append("<p><font color=blue>"+getTime()+"</font>[系统消息] "+j.message+"</p>")
            } else {
                $("#chat_bar").append("<p><font color=blue>"+getTime()+"</font> " + j.sender + "说: " + j.message + "</p>")
            }
            $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight;
        } else {
            console.log("Unknown message type: " + j.type)
        }
    }
}

// For easier server configure.
let ws=new WebSocket("ws://kchat.kiritow.com/websocket","kchat-v1")
bindCallback(ws)

$("#dev_op").click(function(){
    if($("#dev_op").get(0).checked) {
        $("#status_bar").text("连接开发者模式服务器中...")
        if(ws) ws.close()
        ws=new WebSocket("ws://localhost:8001","kchat-v1") 
        bindCallback(ws)
    } else {
        $("#status_bar").text("连接聊天服务器中...")
        if(ws) ws.close()
        let ws=new WebSocket("ws://kchat.kiritow.com/websocket","kchat-v1")
        bindCallback(ws)
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
        ws.send(JSON.stringify({type:"operation",operation:"nickname_change",newname:$("#nickname").val()}))
        ws.send(JSON.stringify({type:"message",message:$("#msg").val()}))
    } else {
        console.log("Sending message:"+ $("#msg").val())
        ws.send(JSON.stringify({type:"message",message:$("#msg").val()}))
    }
    $("#msg").val('')
}

$("#send_msg").click(function(){
    sendMessage()
})

// TODO: provide an option for those who don't want send-on-enter.
$("#msg").on('keypress',function(ev){
    if(ev.keyCode==13) {
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
    ws.send(JSON.stringify({type:"operation",operation:"nickname_change",newname:$("#nickname").val()}))
    saveNickname($("#nickname").val())
    $("#nickname").attr("disabled","disabled")
    $("#confirm_nickname").attr("hidden","hidden")
    $("#change_nickname").removeAttr("hidden")
    $("#msg").removeAttr("disabled")
    $("#send_msg").removeAttr("disabled")
})