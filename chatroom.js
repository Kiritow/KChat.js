function getTime() {
    var date = new Date()
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    var second = date.getSeconds();
    minute = minute < 10 ? ('0' + minute) : minute;
    second = second < 10 ? ('0' + second) : second;
    return y + '-' + m + '-' + d+' '+h+':'+minute+':'+second;
}

function saveNickname() {
    console.log("Saving nickname:"+$("#nickname").val())
    $.cookie('this_nickname',escape($("#nickname").val()),{expires:3})
}

function getNickname() {
    var name=$.cookie('this_nickname')
    if(name==null) {
        return null
    } else {
        return unescape(name)
    }
}

var _xlst=new Array()
function ListAdd(name) {
    _xlst.push(name)
    $("#online_tab").append("<p>"+name+"</p>")
}

function ListClear() {
    _xlst=new Array()
    $("#online_tab").empty()
}

function ListDel(name) {
    var idx=_xlst.indexOf(name)
    if(idx!=-1) {
        _xlst.splice(idx,1)
        $("#online_tab").empty()
        $.each(_xlst,function(idx,name){
            $("#online_tab").append("<p>"+name+"</p>")
        })
    }
}

var ws

function bindCallback() {
    ws.onopen=function() {
        console.log("onopen")
        $("#status_bar").text("已连接到服务器.")
        console.log("Sending hello broadcast...")
        if(getNickname()==null) {
            ws.send("*#newj")
            ws.send("欢迎新人~!")
            $("#nickname").removeAttr("disabled")
        } else {
            ws.send("*#name "+getNickname())
            ws.send("欢迎回来,"+getNickname())
            $("#nickname").val(getNickname())
        }
        console.log("hello sent.")
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
        if(ev.data.substr(0,2)=="#*") {
            var command=ev.data.substr(2,4)
            console.log("Received command : "+command)
            if(command=="Lclr") {
                console.log("Command: clear list")
                ListClear()
            } else if(command=="Ladd") {
                console.log("Command: list add")
                ListAdd(ev.data.substr(6))
            } else if(command=="Ldel") {
                console.log("Command: list remove")
                ListDel(ev.data.substr(6))
            } else {
                console.log("Unknown command: "+command)
            }
        } else {
            $("#chat_bar").append("<p><font color=blue>"+getTime()+"</font> "+ev.data+"</p>")
            $("#chat_bar").get(0).scrollTop=$("#chat_bar").get(0).scrollHeight;
        }
    }
}

var ws=new WebSocket("ws://kiritow.com:59505")
bindCallback()

$("#dev_op").click(function(){
    if($("#dev_op").get(0).checked) {
        $("#status_bar").text("连接开发者模式服务器中...")
        if(ws) ws.close()
        ws=new WebSocket("ws://localhost:59505")
        bindCallback()
    } else {
        $("#status_bar").text("连接聊天服务器中...")
        if(ws) ws.close()
        ws=new WebSocket("ws://kiritow.com:59505")
        bindCallback()
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
        ws.send("*#nick "+$("#nickname").val())
        ws.send("[New]"+$("#nickname").val()+"说: "+$("#msg").val())
    } else {
        console.log("Sending message:"+ $("#msg").val())
        ws.send($("#nickname").val()+"说: "+$("#msg").val())
    }
    $("#msg").val('')
}

$("#send_msg").click(function(){
    sendMessage()
})

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
    ws.send("*#nick "+$("#nickname").val())
    ws.send(getNickname()+" 修改了昵称为 "+$("#nickname").val())
    saveNickname($("#nickname").val())
    $("#nickname").attr("disabled","disabled")
    $("#confirm_nickname").attr("hidden","hidden")
    $("#change_nickname").removeAttr("hidden")
    $("#msg").removeAttr("disabled")
    $("#send_msg").removeAttr("disabled")
})