const fs = require('fs')

class LogService {
    static getService() {
        if (!LogService.instance) {
            LogService.instance = new LogService()
        }
        return LogService.instance
    }

    constructor() {
        this.filepath = "run.log"
        this.file = fs.createWriteStream(this.filepath, {
            flags: 'a',
        })
    }

    _log(level, msg) {
        let content = `${new Date().toString()} [${level}] ${msg}`
        this.file.write(content)
        console.log(content)
    }

    log(msg) {
        this._log("INFO", msg)
    }

    info(msg) {
        this._log("INFO", msg)
    }

    warn(msg) {
        this._log("WARN", msg)
    }

    debug(msg) {
        this._log("DEBUG", msg)
    }

    error(msg) {
        this._log("ERROR", msg)
    }
}

module.exports = LogService
