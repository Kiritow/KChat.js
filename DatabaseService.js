const mysql=require('mysql')
const fs=require('fs')

class DatabaseService {
    static getService() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService()
        }
        return DatabaseService.instance
    }

    constructor() {
        let config = fs.readFileSync("config/dbconfig.json", 'utf8')
        let j = JSON.parse(config)
        let pool = mysql.createPool({
            host: j.host,
            user: j.user,
            password: j.password,
            database: j.database
        })
        
        this.pool = pool
    }

    async query() {
        let [sql, ...values] = arguments
        return new Promise((resolve, reject)=>{
            this.pool.query(sql, values, (err, result) => {
                if (err) {
                    return reject(err)
                } else {
                    return resolve(result)
                }
            })
        })
    }

    async update() {
        let [sql, ...values] = arguments
        return new Promise((resolve, reject)=>{
            this.pool.query(sql, values, (err, results) => {
                if (err) {
                    return reject(err)
                } else {
                    return resolve({
                        insertId: results.insertId,
                        affectedRows: results.affectedRows,
                        changedRows: results.changedRows
                    })
                }
            })
        })
    }

    async addUser(username, password, nickname, intro, account_status) {
        return this.update(
            "insert into user (username, password, nickname, intro, account_status) values (?,?,?,?,?)",
            username, password, nickname, intro, account_status
        )
    }

    async getUserByName(username) {
        let result = await this.query("select * from user where username = ?", username)
        if (result.length < 1) {
            return null
        } else {
            return {
                userid: result[0].id,
                username: result[0].username,
                password: result[0].password,
                nickname: result[0].nickname,
                accountStatus: result[0].account_status
            }
        }
    }

    async setAccountStatus(userid, status) {
        return this.update("update user set account_status=? where id=?", status, userid)
    }

    async addUserBan(userid, banTime) {
        return this.update("insert into banned_user (user_id, ban_time) values (?,?) ", userid, banTime)
    }

    async addChatRecord(userid, channel, content) {
        return this.update("insert into chat_record (user_id, channel, content) values (?, ?, ?)", userid, channel, content)
    }

    async addUserHistory(userid, action, data) {
        return this.update("insert into user_history (user_id, action, data) values (?, ?, ?)", userid, action, data)
    }
}

module.exports = DatabaseService
