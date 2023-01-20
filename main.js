const bitcore = require("bitcore-lib");
bitcore.Networks.defaultNetwork = bitcore.Networks.mainnet;
const API_URL = 'https://api.blockcypher.com/v1/btc/main';
let state = {};

exports.generateAddress = () => {
    const privateKey = new bitcore.PrivateKey();
    const address = privateKey.toAddress();

    document.getElementById("address").innerText = address.toString();
    document.getElementById("private-key").innerText = privateKey.toWIF();
    document.getElementById("private-key-input").style.display = 'none';
    document.getElementById("private-key-container").style.display = 'inline-block';
    document.getElementById("set-identity").disabled = true;
    document.getElementById("generate-identity").disabled = true;

    window.alert('Save your private key');

    state = {
        ...state,
        address,
        privateKey
    };
};

exports.setIdentity = () => {
    const privateKey = bitcore.PrivateKey.fromWIF(document.getElementById("private-key-input").value);
    const address = privateKey.toAddress();

    document.getElementById("address").innerText = address.toString();
    document.getElementById("private-key").innerText = privateKey.toWIF();

    document.getElementById("private-key-input").style.display = 'none';
    document.getElementById("private-key-container").style.display = 'inline-block';
    document.getElementById("set-identity").disabled = true;
    document.getElementById("generate-identity").disabled = true;

    state = {
        ...state,
        address,
        privateKey
    };
};

exports.resetIdentity = () => {
    if (window.confirm("Are you sure? Private key will be lost if unsaved")) {
        document.getElementById("address").innerText = 'no identity set';
        document.getElementById("private-key").innerText = '';
        document.getElementById("private-key-input").value = '';
        document.getElementById("private-key-input").style.display = 'inline-block';
        document.getElementById("private-key-container").style.display = 'none';

        document.getElementById("set-identity").disabled = false;
        document.getElementById("generate-identity").disabled = false;

        state = {
            ...state,
            address: null,
            privateKey: null
        };
    }
};

const sendBitcoin = async (destination, amountToSend) => {
    const privateKey = state.privateKey;
    const sourceAddress = state.address.toString();
    const valueSatoshi = amountToSend * 1e8;

    const catchErrors = err => {
        window.alert('Error ' + err);
    }

    const body = JSON.stringify({
        inputs: [{ addresses: [sourceAddress] }],
        outputs: [{ addresses: [destination], value: valueSatoshi }]
    });

    fetch(`${API_URL}/txs/new`, {
        method: "POST",
        mode: 'no-cors',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body
    })
        .then(res => res.json())
        .then(newtx => {
            newtx.pubkeys = [];
            newtx.signatures = newtx.tosign.map(function (tosign) {
                newtx.pubkeys.push(state.privateKey.toPublicKey().toDER().toString('hex'));
                return bitcore.crypto.ECDSA.sign(Buffer.from(tosign, 'hex'), privateKey).toString('hex');
            });
            fetch(`${API_URL}/txs/send`, {
                method: "POST",
                mode: 'no-cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newtx)
            })
                .then(res => res.json())
                .then(() => {
                    window.alert('Done');
                })
                .catch(catchErrors);
        })
        .catch(catchErrors);
};

exports.send = () => {
    const destination = document.getElementById("destination-input").value;
    const amount = parseFloat(document.getElementById('amount-input').value);
    if (window.confirm(`Send ${amount} BTC to ${destination}?`)) {
        sendBitcoin(destination, amount);
    }
};

exports.getBalance = () => {
    fetch(`${API_URL}/addrs/${state.address.toString()}/balance`, {
        method: 'GET'
    }).then(
        res => res.json()
    ).then(res => {
        state.balance = res.balance;
        document.getElementById('balance').innerText = `${res.balance / 1e8} BTC`;
    });
};

window.onbeforeunload = function (e) {
    if (state.privateKey) {
        e = e || window.event;

        if (e) {
            e.returnValue = 'Are you sure? Private key will be lost if unsaved?';
        }

        return 'Are you sure? Private key will be lost if unsaved';
    }
};
