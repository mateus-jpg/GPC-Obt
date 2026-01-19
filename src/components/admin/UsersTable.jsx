"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { listAllUsers } from "@/actions/admin/users"
import { UserClaimsDialog } from "./UserClaimsDialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Eye } from "lucide-react"
import { toast } from "sonner"

export function UsersTable() {
    const router = useRouter()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [pageToken, setPageToken] = useState(undefined)
    const [selectedUser, setSelectedUser] = useState(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const fetchUsers = useCallback(async (token) => {
        setLoading(true)
        try {
            const result = await listAllUsers(100, token)
            setUsers((prev) => (token ? [...prev, ...result.users] : result.users))
            setPageToken(result.pageToken)
        } catch (error) {
            toast.error("Failed to fetch users. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleEdit = (user) => {
        setSelectedUser(user)
        setIsDialogOpen(true)
    }

    const handleUserUpdated = () => {
        // Refresh the list
        fetchUsers()
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>UID</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Structure ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{user.uid}</TableCell>
                                <TableCell>
                                    <Badge variant={user.customClaims?.role === 'admin' ? 'destructive' : user.customClaims?.role === 'structure_admin' ? 'default' : 'outline'}>
                                        {user.customClaims?.role || "user"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.customClaims?.structureIds || "-"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/users/${user.uid}`)}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                                        Edit Claims
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {loading && (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {!loading && pageToken && (
                <div className="flex justify-center">
                    <Button variant="outline" onClick={() => fetchUsers(pageToken)}>
                        Load More
                    </Button>
                </div>
            )}

            {selectedUser && (
                <UserClaimsDialog
                    user={selectedUser}
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onUserUpdated={handleUserUpdated}
                />
            )}
        </div>
    )
}
