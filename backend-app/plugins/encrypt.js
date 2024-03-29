exports.plugin = {
    name: "encrypt",
    once: true,
    register: async (server, options) => {

        // https://github.com/zishon89us/node-cheat/blob/master/stackoverflow_answers/crypto-create-cipheriv.js#L2

        const crypto = require('crypto');
        const algorithm = 'aes-256-ctr';
        encryptbase64 = require('./../configs/encryptbase64');
        const ENCRYPTION_KEY = Buffer.from(encryptbase64.secret, 'base64');
        const IV_LENGTH = 16;

        server.app.encrypt = (text) => {
            let iv = crypto.randomBytes(IV_LENGTH);
            let cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
            let encrypted = cipher.update(text);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            return iv.toString('hex') + ':' + encrypted.toString('hex');
        }

        server.app.decrypt = (text) => {
            try {
                let textParts = text.split(':');
                let iv = Buffer.from(textParts.shift(), 'hex');
                let encryptedText = Buffer.from(textParts.join(':'), 'hex');
                let decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
                let decrypted = decipher.update(encryptedText);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                return decrypted.toString();
            } catch {
                return null;
            }

        }

    }
}