const socket = io()

// Elements
//prefix with dollarSign, will let you know the variable is an element from the dom that you have selected
const $messageForm =  document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')

const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messagesDiv')
const $sidebar = document.querySelector('#sidebar')

//Templates
const $messageTemplate = document.querySelector('#message-template').innerHTML
const $locationTemplate = document.querySelector('#location-template').innerHTML
const $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
//ignoreQueryPrefix, will take everything before the username, mostly the "?"
const { username, room } = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoScroll = () => {
    //New message element
    const $newMessage = $messages.lastElementChild

    //Height of the last message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin


    //Visible Height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    //How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight 

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }

}


$messageForm.addEventListener('submit', (e) => {
    //prevents browser default full page refresh
    e.preventDefault()

    //This will disable the form once it is submitted
    $messageFormButton.setAttribute('disabled','disabled')

    //disable
    const message = e.target.elements.message.value

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()
        //enable
        //This function is run when the event is acknowledged
        if (error){
            return console.log(error)
        }
        console.log("Message delievered!")
    })

})   

socket.on("roomData", ({room, users}) => {
    const html = Mustache.render($sidebarTemplate, {
        users: users,
        room: room
    })
    $sidebar.innerHTML = html
})

socket.on("msg",(message) => {
    console.log(message)

    const html = Mustache.render($messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('hh:mm a')
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoScroll()
})

socket.on("locationMessage",(locationObject) => {
    console.log("Location URL: ",locationObject.locationURL)

    const html = Mustache.render($locationTemplate, {
        username: locationObject.username,
        locationURL: locationObject.locationURL,
        createdAt: moment(locationObject.createdAt).format('hh:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})

$sendLocationButton.addEventListener('click', () => {
    //disable
    $sendLocationButton.setAttribute('disabled','disabled')

    if (!navigator.geolocation){
        return alert('Geolocation is not supported by your browser')
    }
    
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation',{ latitude:position.coords.latitude, longitude: position.coords.longitude}, (deliveredMessage) => {
                // //enable
                $sendLocationButton.removeAttribute('disabled')
                console.log(deliveredMessage)
            })
    })
})

socket.emit('join',{username, room}, (error) => {
    if (error){
        alert(error)
        location.href = '/'
    }
})

