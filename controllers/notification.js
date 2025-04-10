import { Expo } from 'expo-server-sdk';
const expo = new Expo();

export const sendPushNotification = async (to, title, body, data = {}) => {
    if (!Expo.isExpoPushToken(to)) {
        console.error('Invalid Expo Push Token:', to);
        return;
    }

    const message = {
        to,
        sound: 'default',
        title,
        body,
        data,
    };

    try {
        const tickets = await expo.sendPushNotificationsAsync([message]);
        console.log('✅ Push notification sent:', tickets);
    } catch (err) {
        console.error('❌ Error sending push notification:', err);
    }
};
