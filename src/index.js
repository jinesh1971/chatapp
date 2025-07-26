const path = require('path')
const http = require('http')

const express = require('express')
const multer = require('multer')
const socketio = require('socket.io')
const Filter = require('bad-words')
const fs = require('fs');


// destructe
const { generateMessage, generateLocationMessage } = require('./Utils/messages.js')
const { addUser,  removeUser, getUser, getUsersInRoom } = require('./Utils/users.js')

const app = express()

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
        req.fileInfo = { originalName: file.originalname, uniqueName }; // Save original and unique names
    }
});

const upload = multer({ storage });

//This will create a new web server, If we don't do this, the express library will do it behind the scenes. We are only doing a little refactoring, not changing the behavior
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


//socket.emit = Sends an event to a specific client
//io.emit = Sends an event to every connected client
//socket.broadcast.emit = Sends an event to every connected client except this one.

//io.to.emit() = emits an event to everybody in a specific room
//socket.broadcast.to.emit = Sends an event to everyone except this one, but its limiting it to the room

//io.on is only ever used for connection
io.on('connection', (socket) => {
    console.log('New WebSocket Connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error);
        }

        // Only people in this room will see the message
        socket.join(user.room);

        socket.emit('msg', generateMessage("Admin", 'Welcome'));
        // Notify others in the room that a new user has joined
        socket.broadcast.to(user.room).emit('msg', generateMessage("Admin", `${user.username} has joined the chat!`));

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id);

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
        }

        io.to(user.room).emit('msg', generateMessage(user.username, message));
        callback();
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit(
            'locationMessage',
            generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`)
        );
        callback('Location shared');
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('msg', generateMessage("Admin", `${user.username} has left!`));

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            });
        }
    });

    // Handle file upload notification
    socket.on('fileUploaded', (fileData) => {
        const user = getUser(socket.id);

        if (user) {
            // Notify all users in the room about the uploaded file
            io.to(user.room).emit('msg', generateMessage("Admin", `${user.username} uploahuhuhhuhuded a file: <a href="${fileData.downloadUrl}" target="_blank">Download here</a>`));
        }
    });
});

// File upload route
// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('File upload request received');
    console.log('res.body', req.body);

    if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).send('No file uploaded.');
    }

    console.log('req.body', req.body);
    const socketId = req.body.socketId; // Retrieve the socket ID from the request body
    const file = req.file; // Get the uploaded file information
    const originalName = req.body.originalName;


    const fileData = {
        downloadUrl: `/download/${file.originalname}`,
        originalName: originalName
    };
    console.log('File uploaded successfully, url - ',fileData.downloadUrl ,'originalName - ', originalName);


    if (!socketId) {
        console.error('Socket ID is missing');
        return res.status(400).send('Socket ID is required.');
    }

    const user = getUser(socketId); // Retrieve the user using the socket ID
    if (!user)
    {
        console.error('User not found for socket ID:', socketId);
        return res.status(400).send('User not found.');
    }

 
    console.log("originalName", fileData.originalName);
    // Notify the user's room about the file upload
    io.to(user.room).emit('msg', generateMessage(
        "Admin", 
        `${user.username} uploaded an attachment <a href="${fileData.downloadUrl}" target="_blank" download="${fileData.originalName}">Download here</a>`
    ));
    console.log('File upload notification sent to room:', user.room);

    res.json({ originalName: fileData.originalName, downloadUrl: fileData.downloadUrl });
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
});