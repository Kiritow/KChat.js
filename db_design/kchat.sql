create table `user` (
    `id` int(11) not null auto_increment comment '自增ID',
    `username` varchar(32) not null comment '用户名',
    `password` varchar(64) not null comment '密码(已经处理)',
    `nickname` varchar(128) not null comment '昵称',
    `intro` varchar(256) comment '个人简介',
    `permission_level` int(11) not null default 999 comment '用户等级',
    `account_status` int(11) not null default 0 comment '账户状态. 0 未激活 1 正常 2 临时封禁 3 永久封禁',
    `create_time` timestamp not null default current_timestamp comment '数据创建时间',
    `update_time` timestamp not null default current_timestamp on update current_timestamp comment '数据更新时间',
    primary key (`id`),
    unique key `k_username` (`username`)
);


create table `banned_user` (
    `id` int(11) not null auto_increment comment '自增ID',
    `user_id` int(11) not null comment '用户ID',
    `ban_time` int(11) not null comment '封禁时长',
    `ban_status` tinyint(1) not null default 1 comment '封禁状态. 0 无效 1 生效中',
    `create_time` timestamp not null default current_timestamp comment '封禁开始时间',
    primary key (`id`)
);


create table `user_history` (
    `id` int(11) not null auto_increment comment '自增ID',
    `user_id` char(32) not null comment '用户ID',
    `action` int(11) not null comment '用户操作类型. 1 登录 2 登出',
    `data` varchar(256) default null comment '操作附加数据',
    `create_time` timestamp not null default current_timestamp comment '创建时间',
    primary key (`id`)
);

create table `chat_record` (
    `id` int(11) not null auto_increment comment '自增ID',
    `user_id` int(11) not null comment '用户ID',
    `channel` varchar(128) not null comment '消息频道',
    `content` longtext comment '消息内容',
    `create_time` timestamp not null default current_timestamp comment '创建时间',
    primary key (`id`)
);

