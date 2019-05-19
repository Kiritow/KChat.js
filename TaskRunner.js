class TaskRunner {
    constructor(executor, intervalMS, runtime) {
        if(runtime == undefined || runtime == null) {
            runtime = -1
        }

        if(runtime == 0) return

        this.timesLeft = runtime
        this.executor = executor
        this.interval = intervalMS
        this.args = new Array
        for (let i=3; i<arguments.length; i++) {
            this.args.push(arguments[i])
        }

        function timeoutCallback (runner) {
            try {
                runner.executor(...runner.args)
            } catch (e) {

            }
            if (runner.timesLeft > 0) {
                --runner.timesLeft
            }
            if (runner.timesLeft != 0) {
                runner.timerID = setTimeout(timeoutCallback, runner.interval, runner)
            }
        }

        this.timerID = setTimeout(timeoutCallback, this.interval, this)
    }

    stop() {
        this.timesLeft = 0
        clearTimeout(this.timerID)
    }
}

module.exports = TaskRunner
