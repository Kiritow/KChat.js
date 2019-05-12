const mysql=require('mysql')
const fs=require('fs')

class DatabaseProvider {
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
}

module.exports = DatabaseProvider
