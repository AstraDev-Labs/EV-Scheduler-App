import DashboardNav from '@/components/dashboard/nav'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <DashboardNav />
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-64">
                <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
