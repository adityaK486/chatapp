import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  message: String,
  username: String,
  room: String,
  __createdtime__: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
