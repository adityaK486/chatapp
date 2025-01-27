import Message from "../models/Message.js";

async function mongoGetMessages(room) {
  try {
    
    const messages = await Message.find({ room })
      .sort({ __createdtime__: -1 })
      .limit(100);

    
    return messages.reverse();
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

export default mongoGetMessages;
