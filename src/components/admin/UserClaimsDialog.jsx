"use client"

import React, { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { setUserClaims } from "@/actions/admin/users"

export function UserClaimsDialog({ user, open, onOpenChange, onUserUpdated }) {
    const [loading, setLoading] = useState(false)
    const [role, setRole] = useState("user")
    const [structureId, setStructureId] = useState("")

    useEffect(() => {
        if (user) {
            setRole(user.customClaims?.role || "user")
            setStructureId(user.customClaims?.structureId || "")
        }
    }, [user])

    const handleSave = async () => {
        setLoading(true)
        try {
            // Construct claims object
            const claims = {
                role,
                structureId: structureId || null, // Only save if present
            }

            const result = await setUserClaims(user.uid, claims)

            if (result.success) {
                toast.success("User claims updated successfully")
                onOpenChange(false)
                if (onUserUpdated) onUserUpdated()
            } else {
                toast.error(result.error || "Failed to update user claims")
            }
        } catch (error) {
            toast.error("Failed to update user claims")
        } finally {
            setLoading(false)
        }
    }


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User Claims</DialogTitle>
                    <DialogDescription>
                        Update role and structure access for {user?.email}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <div className="col-span-3">
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="structure_admin">Structure Admin</SelectItem>
                                    <SelectItem value="admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="structureId" className="text-right">
                            Structure ID
                        </Label>
                        <Input
                            id="structureId"
                            value={structureId}
                            onChange={(e) => setStructureId(e.target.value)}
                            className="col-span-3"
                            placeholder="Structure ID (optional)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
