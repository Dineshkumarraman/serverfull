var express = require('express');
var app = express();
var itemRouter = express.Router();
var amqp = require('amqplib/callback_api')

// Require Item model in our routes module.
var Item = require('../models/Item');
var message = "";
var firstTime = "",
    msgNew = "",
    receiveFlag = false;

// Defined store route
itemRouter.route('/add/post').post(function(req, res) {
    req.body.item=req.body.item.toLowerCase();
    var item = new Item(req.body);
    item.save()
        .then(item => {
            res.status(200).json({
                Item: 'Item added successfully'
            });
        })
        .catch(err => {
            res.status(400).send("unable to save to database");
        });
});

// Defined get data(index or listing) route
itemRouter.route('/').get(function(req, res) {
    Item.find(function(err, itms) {
        if (err) {
            console.log(err);
        } else {
            res.json(itms);
        }
    });
});

// Defined edit route
itemRouter.route('/edit/:id').get(function(req, res) {
    var id = req.params.id;
    Item.findById(id, function(err, item) {
        res.json(item);
    });
});

//  Defined update route
itemRouter.route('/update/:id').post(function(req, res) {
    Item.findById(req.params.id, function(err, item) {
        if (!item)
            return next(new Error('Could not load Document'));
        else {
            // do your updates here
            item.item = req.body.item.toLowerCase();
            item.save().then(item => {
                    res.json('Update complete');
                })
                .catch(err => {
                    res.status(400).send("unable to update the database");
                });
        }
    });
});

// Defined delete | remove | destroy route
itemRouter.route('/delete/:id').get(function(req, res) {
    Item.findByIdAndRemove({
            _id: req.params.id
        },
        function(err, item) {
            if (err) res.json(err);
            else res.json('Successfully removed');
        });
});

// Defined edit route
itemRouter.route('/isExisting/:name').get(function(req, res) {
    var name = req.params.name;
    Item.findOne({'item': name}, function(err,item) { 
       if(item!=null){
        console.log(item)
        return res.json({isExist:true,item:item.item})
       }
       else{
        return res.json({isExist:false,item:''})
       }
         });
});

itemRouter.route('/send').post(function(req, res) {
    msgNew = req.body.item;

    if (firstTime == "") {

        amqp.connect('amqp://nqobrvng:7eQPfTwXAT9jgU297vOLYuHPoyCZFDyQ@mosquito.rmq.cloudamqp.com/nqobrvng', function(err, conn) {
            conn.createChannel(function(err, ch) {
                var q = 'hello';

                ch.assertQueue(q, {
                    durable: false
                });
                setInterval(function() {
                    var mess = sendMq(msgNew);
                    firstTime = msgNew;
                    ch.sendToQueue(q, Buffer.from(firstTime));
                    console.log(" [x] Sent %s", firstTime);
                }, 1000);
            });
            // setTimeout(function() { conn.close(); process.exit(0) }, 500);
        });
    }
    res.json('Successfully sent');
});
itemRouter.route('/receive').get(function(req, res) {
    if (!receiveFlag) {
        amqp.connect('amqp://nqobrvng:7eQPfTwXAT9jgU297vOLYuHPoyCZFDyQ@mosquito.rmq.cloudamqp.com/nqobrvng', function(err, conn) {
            console.log("conne" + err);
            conn.createChannel(function(error, ch) {
                var q = 'hello';
                ch.assertQueue(q, {
                    durable: false
                });
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
                ch.consume(q, function(msg) {
                    console.log(" [x] Received %s", msg.content.toString());
                    message = msg.content.toString();
                }, {
                    noAck: true
                });
            });

        });
        receiveFlag = true;
    }
    res.json('Successfully received');
});

itemRouter.route('/receiveMq').get(function(req, res) {
    res.json([{
        item: message
    }])
});

function sendMq(msg) {
    if (firstTime == msg) {
        return true;
    } else {
        return false;
    }
}
module.exports = itemRouter;
