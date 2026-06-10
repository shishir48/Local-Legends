import cron from 'node-cron';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';
import { sendToUser } from '../lib/push';

const MESSAGES = [
  (name: string) => `yo ${name} use the app bro, what are you doing`,
  (name: string) => `yo ${name} i know you saw that notification. open the app`,
  (name: string) => `hey ${name} ur gems are lonely. come say hi`,
  (name: string) => `${name} get back in here. we miss u. yes u specifically`,
  (name: string) => `psst ${name} there's probably a new hidden gem near u rn`,
  (name: string) => `${name} stop scrolling twitter and rate some gems`,
  (name: string) => `yo ${name} your opinion matters. go upvote something`,
  (name: string) => `${name} notifica. shhh just open the app`,
  (name: string) => `${name} i bet u cant name 5 good cafes. prove me wrong`,
  (name: string) => `hey ${name} im not saying ur addicted but... just open it`,
  (name: string) => `${name} the gems are calling 📞`,
  (name: string) => `yknow what ${name} this app runs on your validation. so validate`,
  (name: string) => `${name} youve been gone a while. we noticed. we care`,
  (name: string) => `yo ${name} submit a gem or ill submit u`,
  (name: string) => `${name} random fact: u havent opened the app today. sad`,
  (name: string) => `hey ${name} remember that spot u loved? someone just commented on it`,
  (name: string) => `${name} open app. do it. no regrets`,
  (name: string) => `yo ${name} ive been programmed to annoy u until u open the app`,
  (name: string) => `${name} imagine a world without local-legend. boring. now open it`,
  (name: string) => `hey ${name} this is ur daily reminder to be legendary`,
  (name: string) => `${name} ur gem count is looking weak. step it up`,
  (name: string) => `yo ${name} notification supremacy. u cant resist`,
  (name: string) => `${name} real ones check the feed daily. are u real`,
  (name: string) => `hey ${name} come back... please... im just a bot... i need purpose`,
  (name: string) => `${name} open the app or i will send another notification tomorrow`,
  (name: string) => `yo ${name} this is a threat. open. the. app. please`,
  (name: string) => `hey ${name} i spent 25 messages on this. the least u can do is open it`,
  (name: string) => `${name} fine. ignore me. see if i care. (i care)`,
  (name: string) => `yo ${name} last one i promise. unless u dont open it`,
  (name: string) => `${name} ok thats 30 messages. im tired. just open the app. please`,
];

function messageForDay(name: string): string {
  const day = new Date().getDate();
  const idx = (day - 1) % MESSAGES.length;
  return MESSAGES[idx](name);
}

/**
 * Send a cheeky daily push to every user with at least one push token.
 * Scheduled at 10:00 AM server time via node-cron.
 */
async function sendDailyReminders(): Promise<void> {
  const userIds = await PushToken.distinct('user');
  if (userIds.length === 0) return;

  const users = await User.find({ _id: { $in: userIds } })
    .select('displayName')
    .lean();

  for (const u of users) {
    const body = messageForDay(u.displayName);
    sendToUser(String(u._id), {
      title: '📍 Local Legend',
      body,
    }).catch((err) => console.warn('[daily-reminder] send failed:', (err as Error).message));
  }

  console.log(`[daily-reminder] sent to ${users.length} users`);
}

let cronTask: ReturnType<typeof cron.schedule> | null = null;

export function startDailyReminder(): void {
  if (cronTask) return;
  // At 10:00 every day in server timezone
  cronTask = cron.schedule('0 10 * * *', () => {
    sendDailyReminders().catch((err) =>
      console.error('[daily-reminder] job failed:', err)
    );
  });
  console.log('[daily-reminder] scheduled for 10:00 daily');
}

export function stopDailyReminder(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}