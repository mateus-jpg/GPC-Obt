import { CreateStructureForm } from "@/components/admin/CreateStructureForm"

export const metadata = {
    title: "Create Structure",
}

export default function CreateStructurePage() {
    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <CreateStructureForm />
        </div>
    )
}
