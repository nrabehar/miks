import { workspacesApi, type Notification } from '#/lib/api/workspaces.api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BellIcon, CheckCheckIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function NotificationsBell() {
	const qc = useQueryClient()
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	const { data: countData } = useQuery({
		queryKey: ['notifications-count'],
		queryFn: () => workspacesApi.countUnread(),
		refetchInterval: 30_000,
	})

	const { data: notifications = [], isLoading } = useQuery({
		queryKey: ['notifications', open],
		queryFn: () => workspacesApi.listNotifications(false),
		enabled: open,
	})

	const markAllMut = useMutation({
		mutationFn: () => workspacesApi.markAllRead(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['notifications-count'] })
			qc.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => toast.error('Erreur'),
	})

	const markOneMut = useMutation({
		mutationFn: (id: string) => workspacesApi.markRead(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['notifications-count'] })
			qc.invalidateQueries({ queryKey: ['notifications'] })
		},
	})

	// Close on outside click
	useEffect(() => {
		if (!open) return
		function onDown(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', onDown)
		return () => document.removeEventListener('mousedown', onDown)
	}, [open])

	const unread = countData?.count ?? 0

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((p) => !p)}
				className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
				aria-label={`Notifications${unread > 0 ? ` — ${unread} non lues` : ''}`}
			>
				<BellIcon className="size-5" />
				{unread > 0 && (
					<span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
						{unread > 99 ? '99+' : unread}
					</span>
				)}
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, scale: 0.96, y: -4 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: -4 }}
						transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
						className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-card shadow-lg"
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-border px-4 py-3">
							<p className="text-sm font-semibold text-foreground">
								Notifications
								{unread > 0 && (
									<span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
										{unread}
									</span>
								)}
							</p>
							<div className="flex items-center gap-1.5">
								{unread > 0 && (
									<button
										onClick={() => markAllMut.mutate()}
										disabled={markAllMut.isPending}
										className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
										title="Tout marquer comme lu"
									>
										<CheckCheckIcon className="size-3.5" />
										Tout lire
									</button>
								)}
								<button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>
						</div>

						{/* List */}
						<div className="max-h-80 overflow-y-auto">
							{isLoading ? (
								<div className="space-y-2 p-3">
									{[0, 1, 2].map((i) => (
										<div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
									))}
								</div>
							) : notifications.length === 0 ? (
								<div className="px-4 py-8 text-center">
									<BellIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
									<p className="text-sm font-medium text-foreground">Aucune notification</p>
									<p className="mt-0.5 text-xs text-muted-foreground">Vous êtes à jour !</p>
								</div>
							) : (
								<div className="divide-y divide-border">
									{notifications.map((n) => (
										<NotificationItem
											key={n.id}
											notification={n}
											onRead={() => markOneMut.mutate(n.id)}
										/>
									))}
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

function NotificationItem({ notification: n, onRead }: { notification: Notification; onRead: () => void }) {
	function fmtDate(iso: string) {
		const d = new Date(iso)
		const diff = Date.now() - d.getTime()
		if (diff < 60_000) return 'À l\'instant'
		if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`
		if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`
		return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
	}

	return (
		<div
			className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.isRead ? 'bg-primary/3 hover:bg-primary/5' : 'hover:bg-muted/40'}`}
		>
			<div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-primary'}`} />
			<div className="min-w-0 flex-1">
				<p className={`text-xs leading-snug ${n.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
					{n.title}
				</p>
				{n.body && (
					<p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
				)}
				<p className="mt-1 text-[10px] text-muted-foreground/70">{fmtDate(n.sentAt)}</p>
			</div>
			{!n.isRead && (
				<button
					onClick={onRead}
					className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
					title="Marquer comme lu"
				>
					<CheckCheckIcon className="size-3.5" />
				</button>
			)}
		</div>
	)
}
