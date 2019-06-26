const Blockchain = require('./blockchain')


const ethereum = new Blockchain();

const block = {"chain":[{"index":1,"timestamp":1561537826345,"transactions":[],"nonce":100,"hash":"0","previousBlockHash":"0"},{"index":2,"timestamp":1561537832723,"transactions":[],"nonce":85021,"hash":"00000533d7b3de42c4051cc52167cd46812b0312bebd30c2a114859eecc6202f","previousBlockHash":"0"},{"index":3,"timestamp":1561537953157,"transactions":[{"amount":12.5,"sender":"00","recipient":"a5ee88a097ec11e9897e5986c6ab6771","transactionId":"a9c189a097ec11e9897e5986c6ab6771"},{"transactionId":"cb09214097ec11e9897e5986c6ab6771"},{"transactionId":"dd5f580097ec11e9897e5986c6ab6771"}],"nonce":339531,"hash":"000003016a5de8e3f7e7561c052716b5b53ffab4c1fd4b0a68bf67671f988cfa","previousBlockHash":"00000533d7b3de42c4051cc52167cd46812b0312bebd30c2a114859eecc6202f"}],"pendingTransactions":[{"amount":12.5,"sender":"00","recipient":"a5ee88a097ec11e9897e5986c6ab6771","transactionId":"f185e1f097ec11e9897e5986c6ab6771"}],"currentNodeUrl":"http://localhost:3001","networkNodes":[]}
console.log(ethereum.chainIsValid(block))