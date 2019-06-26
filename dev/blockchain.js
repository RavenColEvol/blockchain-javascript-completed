const sha256 = require('sha256')
const uuid = require('uuid/v1')
const currentNodeUrl = process.argv[3];

function Blockchain(){
    this.chain = [];
    this.pendingTransactions = [];
    this.currentNodeUrl = currentNodeUrl;

    this.networkNodes = [
        
    ]
    this.createNewBlock(100,'0','0');
}


/**
 * create-new-block
 * params:(nonce,previousBlockHash,hash)
 * returns newBlock
 */
Blockchain.prototype.createNewBlock = function(nonce,previousBlockHash,hash){
    const newBlock = {
        index:this.chain.length+1,
        timestamp:Date.now(),
        transactions:this.pendingTransactions,
        nonce:nonce,
        hash:hash,
        previousBlockHash:previousBlockHash,
    };

    this.pendingTransactions  = [];
    this.chain.push(newBlock);
    return newBlock;
}

/**
 * get-last-block
 * params: none
 * returns lastBlock
 */
Blockchain.prototype.getLastBlock = function(){
    return this.chain[this.chain.length-1];
}

/**
 * create-transaction
 * params:(amount,sender,recipient) 
 * returns index of last block
 */ 
Blockchain.prototype.createTransaction = function(amount,sender,recipient){
    const newTransaction = {
        amount:amount,
        sender:sender,
        recipient:recipient,
        transactionId:uuid().split('-').join('')
    }
    return newTransaction;
    
}
Blockchain.prototype.addTransactionToTransactions = function(transactionObj){
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
}

/**
 * hash-block
 * params:(previousBlockHash,currentBlockData,nonce)
 * returns hash
 */
Blockchain.prototype.hashBlock = function(previousBlockHash,currentBlockData,nonce)
{
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString)
    return hash;
}

/**
 * proof-of-work
 * params:(previousBlock,currentBlockData)
 * returns nonce
 */
Blockchain.prototype.proofOfWork = function(previousBlockHash,currentBlockData){
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash,currentBlockData,nonce);
    while(hash.substr(0,5) !='00000')
    {
        nonce++;
        hash = this.hashBlock(previousBlockHash,currentBlockData,nonce);
    }
    return nonce;
}

Blockchain.prototype.chainIsValid = function(blockchain){
    let isValid = true;
    for(var i = 1;i<blockchain.length;i++)
    {
        const currentBlock = blockchain[i];
        const previousBlock = blockchain[i-1];
        const blockHash = this.hashBlock(previousBlock['hash'],{'transactions':currentBlock['transactions'],'index':currentBlock['index']},currentBlock['nonce']);

        if(blockHash.substr(0,4)!=='0000') isValid = false;
        if(currentBlock['previousBlockHash']!==previousBlock['hash']) isValid = false;

    }
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] == 100;
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] == '0';
    const correctHash = genesisBlock['hash'] == '0';
    const correctTransaction = genesisBlock['transactions'].length == 0;
    if(!correctHash||!correctNonce||!correctPreviousBlockHash||!correctTransaction) isValid = false;

    return isValid;
}

Blockchain.prototype.getBlockHash = function(blockHash){
    let correctBlock = null;
    this.chain.forEach(block=>{
        if(block['hash']===blockHash)
        {correctBlock = block;}
    })
    return correctBlock;
}

Blockchain.prototype.getTransaction = function(transactionId){
    let correctBlock = null;
    let correctTransaction = null;
    this.chain.forEach(block=>{
        block.transactions.forEach(transaction=>{
            if(transaction['transactionId']===transactionId)
            {correctBlock = block;correctTransaction=transaction;}
        })
    })
    return {
        correctBlock:correctBlock,
        correctTransaction:correctTransaction
    };
}

Blockchain.prototype.getAddressData = function(address){
    let addressTransactions = [];
    this.chain.forEach(block=>{
        block.transactions.forEach(transaction=>{
            if(transaction.sender==address||transaction.recipient==address)
            addressTransactions.push(transaction);
        })
    })
    let balance = 0;
    addressTransactions.forEach(transaction=>{
        if(transaction.sender==address) balance-=transaction.amount;
        if(transaction.recipient==address) balance+=transaction.amount;
    });

    return{
        addressBalance:balance,
        addressTransactions:addressTransactions
    }
}

module.exports = Blockchain;