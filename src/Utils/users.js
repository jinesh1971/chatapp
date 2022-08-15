const users = []


// addUser, removeUser, getUser, getUsersInRoom

const addUser = ({id, username, room}) => {
    //Clean the data
    username = username.trim().toLowerCase()
    room = room.trim().toLowerCase()

    //Validate the data
    if (!username || !room){
        return {
            error: 'Username and room are required'
        }
    }

    //Check for existing user
    const existingUser = users.find((user) => {
        return user.room === room && user.username === username
    })

    //Validate username
    if (existingUser){
        return {
            error: 'Username is in use in this room already!'
        }
    }

    //Store User
    const user = {id, username, room}
    users.push(user)
    return { user }
}

const removeUser = (id) => {
    const index = users.findIndex((user) => {
        return user.id === id
    })

    if (index !== -1){
        //splice allows us to remove items by index, second argument is number of items we want to remove
        return users.splice(index, 1)[0]
    }
}

const getUser = (userId) => {
    return users.find((user) => user.id === userId)
}

const getUsersInRoom = (roomName) => {
    roomName = roomName.trim().toLowerCase()
    return users.filter((user) => user.room === roomName)
}

module.exports = {
    addUser, 
    removeUser,
    getUser,
    getUsersInRoom
}