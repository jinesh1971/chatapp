const path = require('path')
const http = require('http')

const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')


// destructe
const { generateMessage, generateLocationMessage } = require('./Utils/messages.js')
const { addUser,  removeUser, getUser, getUsersInRoom } = require('./Utils/users.js')

const app = express()
//This will create a new web server, If we don't do this, the express library will do it behind the scenes. We are only doing a little refactoring, not changing the behavior
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../../public');

app.use(express.static(publicDirectoryPath))



//socket.emit = Sends an event to a specific client
//io.emit = Sends an event to every connected client
//socket.broadcast.emit = Sends an event to every connected client except this one.

//io.to.emit() = emits an event to everybody in a specific room
//socket.broadcast.to.emit = Sends an event to everyone except this one, but its limiting it to the room

//io.on is only ever used for connection
io.on('connection', (socket) => {
    console.log('New WebSocket Connection')
    

    socket.on('join', (options, callback) => {

        const {error, user} = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        //Only people in this room will see the message
        socket.join(user.room)



        socket.emit('msg',generateMessage("Admin", 'Welcome'))
        //Socket.broadcast will send a message to all existing clients, except the client that just joined the server, limiting it to the particular rooom
        socket.broadcast.to(user.room).emit('msg', generateMessage("Admin", `${user.username} has joined the chat!` )) 

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id)

        if (filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('msg',generateMessage(user.username, message))
        callback()
    })

    //If I want to run code for when a given socket gets disconnected, I will use socket.on()
    //Socket.on library has disconnect and connect implemented already

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        
        if (user){
            //Send message to every client that is still connected
            io.to(user.room).emit('msg', generateMessage("Admin", `${user.username} has left!`))

            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation',(coords, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback('Location shared') 
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})