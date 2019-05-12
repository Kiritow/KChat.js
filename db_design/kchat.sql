create table `t_user` (
    `f_id` int(11) not null auto_increment comment '自增ID',
    `f_username` varchar(32) not null comment '用户名',
    `f_userid` char(32) not null comment '用户ID',
    `f_password` varchar(128) not null comment '密码(已经处理)',
    `f_nickname` varchar(128) not null comment '昵称',
    `f_intro` varchar(256) comment '个人简介',
    `f_permission_level` int(11) not null default 999 comment '用户等级',
    `f_account_status` int(11) not null default 0 comment '账户状态',
    `f_create_time` timestamp not null default currnet_timestamp comment '数据创建时间',
    `f_update_time` timestamp not null default currnet_timestamp on update currnet_timestamp comment '数据更新时间'
);


create table `t_chat_record` (
    `f_id` int(11) not null auto_increment,
    `f_userid` int(11) not null comment '用户ID',
    `f_msg_type` int(11) not null comment '消息类型',
    `f_msg` varchar(3000) default '' comment '消息内容'
);

create table `t_chat_record` (
    `f_id` int(11) not null integer primary key,
    `f_userid` int(11) not null comment '用户ID',
    `f_msg_type` int(11) not null comment '消息类型',
    `f_msg` varchar(3000) default '' comment '消息内容'
);


