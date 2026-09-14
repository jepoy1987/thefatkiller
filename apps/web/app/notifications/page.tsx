import Link from 'next/link';
import { AppShell } from '../../components/layout/app-shell';
import { PageHeader } from '../../components/ui/headings';
import { Card,CardContent } from '../../components/ui/card';
import { buttonStyles } from '../../components/ui/button';
import { getNotifications } from '../../lib/data/notifications';
import { NotificationReadForm } from '../../features/notifications/forms';
import { notificationExpired,unreadLabel } from '../../features/notifications/domain';
export default async function NotificationsPage(){
 const {notifications,timezone,count}=await getNotifications();const now=new Date();
 const dateFormat=new Intl.DateTimeFormat('en-US',{timeZone:timezone,dateStyle:'medium',timeStyle:'short'});
 return <AppShell active="notifications"><div className="grid max-w-4xl gap-6"><PageHeader eyebrow="Your updates" title="Notifications" description={`${unreadLabel(count)} unread · latest 100 notifications · ${timezone}`}/><div className="flex flex-wrap items-start gap-3"><Link href="/settings/notifications" className={buttonStyles({variant:'outline',size:'sm'})}>Reminder settings</Link><NotificationReadForm all/></div><p className="text-sm text-muted-foreground">In-app reminders expire after 48 hours. Expired items stay in history but do not count as unread.</p>{!notifications.length?<Card><CardContent className="py-8"><h2 className="font-bold">You’re all caught up</h2><p className="mt-2 text-sm text-muted-foreground">Your notifications will appear here. Choose which reminders you want in Reminder settings.</p></CardContent></Card>:<ol className="grid gap-3">{notifications.map(n=>{const expired=notificationExpired(n.expires_at,now);return <li key={n.id}><Card><CardContent className="grid gap-3 py-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">{n.title}</h2><span className="text-xs font-semibold">{expired?'Expired':n.read_at?'Read':'Unread'}</span></div><p className="text-sm">{n.message}</p><time dateTime={n.created_at} className="text-xs text-muted-foreground">{dateFormat.format(new Date(n.created_at))}</time><div className="flex flex-wrap items-start gap-3">{n.action_url&&!expired?<Link href={n.action_url} className={buttonStyles({size:'sm'})}>Open {n.action_url==='/glp1'?'journal':n.action_url==='/check-ins'?'check-ins':n.action_url.slice(1)}</Link>:null}{!expired?<NotificationReadForm id={n.id} read={!n.read_at}/>:null}</div></CardContent></Card></li>})}</ol>}</div></AppShell>;
}
