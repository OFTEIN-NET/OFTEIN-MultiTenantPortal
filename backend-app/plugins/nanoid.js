exports.plugin = {
    name: "nanoid",
    once: true,
    register: (server, options) => {
        const {customAlphabet} = require('nanoid');
        server.app.id = (size = 30) => {
            nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', size)
            return nanoid()
        }
        server.app.n = (size=1) => Array.from(Array(size).keys())

    }
}