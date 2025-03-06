import { LayoutEditor } from "@/components/layout-editor"

export default function LayoutEditorPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold mb-6">Mapas y zonas para butacas</h1>
        <div className="ml-auto">
          <a className="btn btn-neutral" href="/">
            Crear Butacas
          </a>
        </div>
      </div>
      <LayoutEditor />
    </div>
  )
}

