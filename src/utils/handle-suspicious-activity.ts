export default function handleSuspiciousActivity(message: string = "SUSPICIOUS ACTIVITY DETECTED") {
  console.warn(message);
  // @todo - send an email if their account was locked
}
