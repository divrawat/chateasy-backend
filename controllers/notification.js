import axios from "axios"

const sendPushNotification = async (expoPushToken, title, body) => {
    const message = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: { withSome: "data" },
    };

    await axios.post("https://exp.host/--/api/v2/push/send", message, {
        headers: {
            "Content-Type": "application/json",
        },
    });
};

export default sendPushNotification
