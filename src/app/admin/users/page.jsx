import { UsersTable } from "@/components/admin/UsersTable"

export const metadata = {
    title: "User Management",
}

export default function UsersPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>
            <UsersTable />
        </div>
    )
}
