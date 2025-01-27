import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import connectMongoDB from './db/connectMongoDB.js';
import Message from './models/Message.js';
import mongoGetMessages from './services/mongo-get-messages.js';
import { leaveRoom } from './utils/leave-room.js';

dotenv.config();
const app = express();
app.use(cors()); 

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
});

const CHAT_BOT = 'ChatBot';
let chatRoom = '';
let allUsers = [];

connectMongoDB();

io.on('connection', (socket) => {
    console.log(`User connected ${socket.id}`);
  
    //joining a room
    socket.on('join_room',async (data)=>{
        const {username, room} = data;
        socket.join(room);

        const __createdtime__ = Date.now();
        
        //notify others in the room
        socket.to(room).emit('receive_message',{
            message:`${username} has joined the chat room`,
            username: CHAT_BOT,
            __createdtime__,
        });

        //welcome user
        socket.emit('receive_message',{
          message: `Welcome ${username}`,
          username: CHAT_BOT,
          __createdtime__,
        });

        //fetching previous messages
        try {
          const last100Messages = await mongoGetMessages(room);
          socket.emit("last_100_messages", last100Messages); // Send the messages to the user
        } catch (err) {
          console.error("Error fetching last 100 messages:", err);
        }

        //track users in the room
        chatRoom = room;
        allUsers.push({id:socket.id,username,room});
        const chatRoomUsers = allUsers.filter((user)=>user.room===room);
        socket.to(room).emit('chatroom_users',chatRoomUsers);
        socket.emit('chatroom_users',chatRoomUsers);
    });

    //sending messages
    socket.on("send_message", async (data) => {
      const { message, username, room, __createdtime__ } = data;

      // Broadcast the message to others in the room
      io.in(room).emit("receive_message", data);

      // Save the message to MongoDB
      try {
        const newMessage = new Message({ message, username, room, __createdtime__ });
        await newMessage.save();
        console.log("Message saved to MongoDB");
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    socket.on('leave_room', (data) => {
      const { username, room } = data;
      socket.leave(room);
      const __createdtime__ = Date.now();
      // Remove user from memory
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(room).emit('chatroom_users', allUsers);
      socket.to(room).emit('receive_message', {
        username: CHAT_BOT,
        message: `${username} has left the chat`,
        __createdtime__,
      });
      console.log(`${username} has left the chat`);
    }); 

    socket.on('disconnect',()=>{
      console.log('User disconnected from chat');
      const user = allUsers.find((user)=>user.id == socket.id);
      if(user?.username){
        allUsers = leaveRoom(socket.id, allUsers);
        socket.to(chatRoom).emit('chatroom_users', allUsers);
        socket.to(chatRoom).emit('receive_message',{
          messsage: `${user.username} has disconnected from the chat`,
        });
      }
    });
  });
  


server.listen(PORT,()=>{
  console.log(`Server is running on ${PORT}`);
})