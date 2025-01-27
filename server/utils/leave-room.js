export const leaveRoom = (userID, chatRoomUsers) => {
    return chatRoomUsers.filter((user)=> user.id!==userID);
}