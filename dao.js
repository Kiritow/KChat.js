const mysql=require('mysql')
const fs=require('fs')

class UserInfoProvider {
    constructor() {
        let buffer=fs.readFileSync('dbconfig.json','utf8')
        let j=JSON.parse(buffer)
        let conn=mysql.createConnection({
            host: j.jost,
            user: j.user,
            password: j.password,
            database: j.database
        })
        conn.connect() // This is not clean at all.

        this.conn=conn
    }
}

module.exports = UserInfoProvider