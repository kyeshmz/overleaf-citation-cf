import { FileText } from "lucide-react"
import Link from "next/link"

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <span className="font-bold text-xl">CiteToTeX</span>
        </Link>
        <nav className="flex gap-6">
          <Link href="#how-it-works" className="text-sm font-medium hover:text-primary">
            How It Works
          </Link>
          <Link href="#formats" className="text-sm font-medium hover:text-primary">
            Formats
          </Link>
          <Link href="#about" className="text-sm font-medium hover:text-primary">
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
