import * as Notifications from "expo-notifications";



async function testNotification(body) {

  const { status } = await Notifications.requestPermissionsAsync();
 
  if (status !== "granted") {
    alert("Notification permission denied");
    return;
  }
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: body.transliteration,
      body: body.meaning,
    },
    trigger: null,
  });
}
