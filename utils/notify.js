function pushNotificationToNtfy(title, message) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: {
      'Title': title,
      'Content-Type': 'text/plain'
    },
    body: message
  }).then(res => {
    if (!res.ok) {
      console.error('Error sending notification to ntfy:', res.statusText);
    }
  }
  ).catch(err => {
    console.error('Error sending notification to ntfy:', err);
  });
}

module.exports = { pushNotificationToNtfy };