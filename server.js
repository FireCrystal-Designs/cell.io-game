
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var foodX = [];
var foodY = [];
var foodColor = [];
var coordX = [];
var coordY = [];
var clientID = [];
var client_to_client_ID = [];
var size = [];
var clientName = [];
var client_type = [];
var donating = [];
var clientType = [];
var clients = 0;
var finished = false;


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

for (var i = 0; i < 800; i++) {
   foodX[i] =  getRandomInt(-2500, 2500);
    foodY[i] =  getRandomInt(-2500, 2500);
    var randomInt = getRandomInt(0, 2);
    var color = "";
    if (randomInt == 0) {
        color = "green";
    }
    if (randomInt == 1) {
        color = "purple";
    }
    if (randomInt == 2) {
        color = "blue";
    }
    foodColor[i] = color;
}

function checkForPlayerCollision() {
    //if (clients > 1) {
    for (var i = 0; i < clients; i++) {
        for (var j = 0; j < clients; j++) {
            if (i == j) {
            }
            else {
                var distance = Math.sqrt( (coordX[i]-coordX[j])*(coordX[i]-coordX[j]) + (coordY[i]-coordY[j])*(coordY[i]-coordY[j]));
                if (distance < 50) {
                    if (client_type[i] == "red" && client_type[j] == "white") {
                        io.to(clientID[i]).emit('expand', -0.1);
                        io.to(clientID[j]).emit('expand', 0.1);
                    }
                    if (client_type[i] == "white" && client_type[j] == "red") {
                        io.to(clientID[i]).emit('expand', 0.1);
                        io.to(clientID[j]).emit('expand', -0.1);
                    }
                    if (client_type[i] == "red" && client_type[j] == "green") {
                        io.to(clientID[i]).emit('type', 'infected');
                    }
                    if (client_type[i] == "green" && client_type[j] == "red") {
                        io.to(clientID[j]).emit('type', 'infected');
                    }
                    if (client_type[i] == "white" && client_type[j] == "green") {
                        if (size[i] > size[j] + 10) {
                            io.to(clientID[j]).emit('death', client_to_client_ID[j]);
                            io.to(clientID[i]).emit('expand', -10);
                        }
                    }
                    if (client_type[i] == "green" && client_type[j] == "white") {
                        if (size[j] > size[i] + 10) {
                            io.to(clientID[i]).emit('death', client_to_client_ID[i]);
                            io.to(clientID[j]).emit('expand', -10);
                        }
                    }
                }
            }
        }
    }
   // }
}

setInterval(addFood, 500) 

function addFood() {
    if (foodX.length > 1500) {
        
    }
    else {
        foodX.push(getRandomInt(-2500, 2500));
        foodY.push(getRandomInt(-2500, 2500));
        var randomInt = getRandomInt(0, 2);
        var color = "";
        if (randomInt == 0) {
            //Green
            color = "#2ecc71";
        }
        if (randomInt == 1) {
            //Purple
            color = "#9b59b6";
        }
        if (randomInt == 2) {
            //Blue
            color = "#2980b9";
        }
        foodColor.push(color);
        io.emit('food', [foodX, foodY, foodColor]);
    }
}

function checkFoodCollision(cord) {
    var collision = false;
    for (var i = 0; i < foodX.length; i++) {
        var distance = Math.sqrt( (cord[0]-foodX[i])*(cord[0]-foodX[i]) + (cord[1]-foodY[i])*(cord[1]-foodY[i]) );
        if (distance < cord[2] + 5) {
        // collision detected!
        collision = true;
        var index = foodX.indexOf(foodX[i]);
        foodX.splice(index, 1);
        foodY.splice(index, 1); 
        foodColor.splice(index, 1);
    }
    }
    return collision; 
}
var count = 0;
var emergencyCounterDelay = 0;

io.on('connection', function(socket){
    io.emit('food', [foodX, foodY, foodColor]);
    clients += 1;
    console.log("CLIENTS: " + clients);
    
    var random = getRandomInt(1, 3);
    var type = "";
    if (random == 1) {
        type = "infected";
    }
    if (random == 2) {
        type = "whiteCell";
    }
    if (random == 3) {
        type = "redCell";
    }
    io.to(socket.id).emit('type', type);
    
    socket.on('disconnect', function(){
        console.log('USER DIED/DISCONNECTED');
        io.emit('leaderBoardUpdate', [[], [], []]);
        clients -= 1;
        console.log("CLIENTS: " + clients);
        io.emit('clear', 0);
        count = 0;
            coordX = [];
            coordY = [];
            size = [];
            client_type = [];
            clientID = [];
            client_to_client_ID = [];
    });
    
    
    socket.on('coord', function(coord) {
        var test = checkFoodCollision(coord);
        if (test == true) {
            io.emit('food', [foodX, foodY, foodColor]);
            io.to(socket.id).emit('expand', 1);
        }
        
        coordX.push(coord[0]);
        coordY.push(coord[1]);
        client_type.push(coord[4]);
        client_to_client_ID.push(coord[3]);
        size.push(coord[2]);
        clientID.push(socket.id);
        socket.broadcast.emit('coords', coord);
        clientName.push(coord[5]);
        count++;
        if (count == clients) {
            emergencyCounterDelay++;
            if (emergencyCounterDelay > 60) {
                io.emit('leaderBoardUpdate', [clientName, size, client_type]);
                emergencyCounterDelay = 0;
            }
            checkForPlayerCollision();
            count = 0;
            coordX = [];
            coordY = [];
            size = [];
            client_type = [];
            clientName = [];
            clientID = [];
            client_to_client_ID = [];
        }
    });
    
});

http.listen(app.get('port'), function(){
  console.log('Node app is running on port', app.get('port'));
});