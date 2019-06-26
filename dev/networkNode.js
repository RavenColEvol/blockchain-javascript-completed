const app = require('express')()
const bodyParser = require('body-parser')
const rp = require('request-promise')

const Blockchain = require('./blockchain')
const ethereum = new Blockchain();
const uuid = require('uuid/v1')

const nodeAddress = uuid().split('-').join('')

const port = process.argv[2];

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))


app.get('/blockchain',function(req,res){
    res.send(ethereum)
});
app.post('/transaction',function(req,res){
    const newTransaction = req.body;
    const blockIndex = ethereum.addTransactionToTransactions(newTransaction);
    res.json({note:"Your block will be added.",index:blockIndex})
});

app.post('/transaction/broadcast',function(req,res){
    const newTransaction = ethereum.createTransaction(req.body.amount,req.body.sender,req.body.recipient);
    ethereum.addTransactionToTransactions(newTransaction);

    const requestPromises = [];
    ethereum.networkNodes.forEach(networkNodeUrl=>{
        const requestOptions = {
            uri:networkNodeUrl+'/transaction',
            method:'post',
            body:newTransaction,
            json:true,
        }

        requestPromises.push(rp(requestOptions));
    })

    Promise.all(requestPromises)
    .then(data=>{
        res.json({
            note:"Successful transaction made."
        })
    });
})
app.get('/mine',function(req,res){
    const lastBlock = ethereum.getLastBlock();
    const lastBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions:ethereum.pendingTransactions,
        index:lastBlock['index']+1,
    }
    const nonce = ethereum.proofOfWork(lastBlockHash,currentBlockData);
    const hash = ethereum.hashBlock(lastBlockHash,currentBlockData,nonce);
    const newBlock = ethereum.createNewBlock(nonce,lastBlockHash,hash);
    let requestPromises = [];
    // mined reward
    ethereum.networkNodes.forEach(networkNodeUrl=>{
        let requestOptions={
            uri:networkNodeUrl+'/receive-new-block',
            method:'POST',
            body:newBlock,
            json:true,
        }

        requestPromises.push(rp(requestOptions));
    })

    Promise.all(requestPromises)
    .then(data=>{
        let requestOption = {
            uri:ethereum.currentNodeUrl+'/transaction/broadcast',
            method:'POST',
            body:{
                "amount":12.5,
                "sender":"00",
                "recipient":nodeAddress
            },
            json:true
        }
        return rp(requestOption);
    })

    res.json({
        note:"new block is mined successfully",
        block:newBlock,
    })
})

app.post('/receive-new-block',function(req,res){
    console.log(req.body);
    const newBlock = req.body;
    const lastBlock = ethereum.getLastBlock();
    
    const isCorrectHash = lastBlock.hash === newBlock.previousBlockHash;
    const isCorrectIndex = lastBlock['index'] + 1 === newBlock['index'];
    if(isCorrectHash&&isCorrectIndex)
    {
        ethereum.chain.push(newBlock);
        ethereum.pendingTransactions = [];
        res.json({
            note:'new block accepted',
            newBlock:newBlock
        })
    }
    else{
        res.json({
            note:'new block rejected',
            newBlock:newBlock
        })
    }
})

app.post('/register-and-broadcast-node',function(req,res){
    // add the req url to network nodes
    const newNodeUrl = req.body.newNodeUrl;
    if(ethereum.networkNodes.indexOf(newNodeUrl)==-1) ethereum.networkNodes.push(newNodeUrl);

    const regNodesPromises = []
    // register in others
    ethereum.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions = {
            uri:networkNodeUrl+'/register-node',
            method:'POST',
            body:{newNodeUrl:newNodeUrl},
            json:true,
        }

        regNodesPromises.push(rp(requestOptions));
    });

    Promise.all(regNodesPromises)
    .then(data=>{
        const bulkRequestOptions = {
            uri:newNodeUrl+'/register-nodes-bulk',
            method:'POST',
            body:{allNetworkNodes:[...ethereum.networkNodes,ethereum.currentNodeUrl]},
            json:true
        }

        return rp(bulkRequestOptions)
        
    })
    .then(data=>{
        res.send('Successfully registered node')
    });
});

app.post('/register-node',(req,res)=>{
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = ethereum.networkNodes.indexOf(newNodeUrl)==-1;
    const notCurrentNode = newNodeUrl != ethereum.currentNodeUrl;
    if(notCurrentNode&&nodeNotAlreadyPresent) ethereum.networkNodes.push(newNodeUrl);
    res.json({
        status:"Successfully added new node",
    });
})

app.post('/register-nodes-bulk',(req,res)=>{
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl=>{
        const nodeNotAlreadyPresent = ethereum.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = networkNodeUrl !== ethereum.currentNodeUrl;
        if(notCurrentNode&&nodeNotAlreadyPresent) ethereum.networkNodes.push(networkNodeUrl);
    })

    res.json({
        status:"successfully had a bulk register"
    })
})


app.get('/consensus',function(req,res){
    const requestPromises = []
    ethereum.networkNodes.forEach(networkNodeUrl=>{
        const requestOptions = {
            uri:networkNodeUrl+'/blockchain',
            method:'GET',
            json:true
        }

        requestPromises.push(rp(requestOptions));
    })

    Promise.all(requestPromises)
    .then(blockchains=>{
        let currentChainLength = ethereum.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;

        blockchains.forEach(blockchain=>{
            if(blockchain.chain.length>maxChainLength)
            {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        })

        if(!newLongestChain||(newLongestChain && !ethereum.chainIsValid(newLongestChain)))
            res.json({
                note:'Current chain has not been replaced',
                chain:ethereum.chain
            });
        else if(newLongestChain&& ethereum.chainIsValid(newLongestChain))
        {
            ethereum.chain = newLongestChain;
            ethereum.pendingTransactions = newPendingTransactions;
            res.json({
                note:'Current chain was replaced and updated',
                chain:ethereum.chain
            })
        }
    })
})

app.get('/block/:blockHash',function(req,res){
    let blockHash = req.params.blockHash;
    let correctBlock = ethereum.getBlockHash(blockHash);
    res.send({
        block:correctBlock
    })
})

app.get('/transaction/:transactionId',function(req,res){
    let transactionId = req.params.transactionId;
    let data = ethereum.getTransaction(transactionId);
    res.json({
        block:data.correctBlock,
        transaction:data.correctTransaction
    })
})

app.get('/address/:address',function(req,res){
     let address = req.params.address;
     let addressData = ethereum.getAddressData(address);
     res.json({
         addressData:addressData
     })
})

app.get('/block-explorer',function(req,res){
    res.sendFile('./block-explorer/index.html',{root:__dirname});
})
app.listen(port,function(){
    console.log(`listening to port ${port}`);
})