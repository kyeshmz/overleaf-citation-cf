import { ArrowRight, BookOpen, Copy, FileText, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function FeatureSection() {
  return (
    <section className="bg-muted/30 py-16" id="how-it-works">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader className="pb-2">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>1. Paste Your Citation</CardTitle>
              <CardDescription>Paste your citation in DOI, APA, MLA, or other formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-40 w-full rounded-md overflow-hidden border">
                <Image
                  src="/placeholder.svg?height=160&width=320"
                  alt="Paste citation"
                  width={320}
                  height={160}
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <RefreshCw className="h-8 w-8 text-primary mb-2" />
              <CardTitle>2. Convert to LaTeX</CardTitle>
              <CardDescription>Our tool instantly converts your citation to BibTeX format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-40 w-full rounded-md overflow-hidden border">
                <Image
                  src="/placeholder.svg?height=160&width=320"
                  alt="Convert citation"
                  width={320}
                  height={160}
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Copy className="h-8 w-8 text-primary mb-2" />
              <CardTitle>3. Copy to Overleaf</CardTitle>
              <CardDescription>Copy the BibTeX and paste it into your Overleaf project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-40 w-full rounded-md overflow-hidden border">
                <Image
                  src="/placeholder.svg?height=160&width=320"
                  alt="Copy to Overleaf"
                  width={320}
                  height={160}
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center" id="formats">
          <h3 className="text-2xl font-bold mb-4">Supported Citation Formats</h3>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            <div className="bg-background px-4 py-2 rounded-full border">DOI</div>
            <div className="bg-background px-4 py-2 rounded-full border">APA</div>
            <div className="bg-background px-4 py-2 rounded-full border">MLA</div>
            <div className="bg-background px-4 py-2 rounded-full border">Chicago</div>
            <div className="bg-background px-4 py-2 rounded-full border">Harvard</div>
            <div className="bg-background px-4 py-2 rounded-full border">IEEE</div>
            <div className="bg-background px-4 py-2 rounded-full border">Vancouver</div>
          </div>
        </div>

        <div className="mt-16 bg-background p-6 rounded-lg border max-w-3xl mx-auto" id="about">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Using Citations in Overleaf
          </h3>
          <ol className="space-y-3 text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>
                Create a file named <code className="bg-muted px-1 py-0.5 rounded">references.bib</code> in your
                Overleaf project
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Paste the BibTeX citation into this file</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>
                In your LaTeX document, add{" "}
                <code className="bg-muted px-1 py-0.5 rounded">\bibliography{"references"}</code> where you want your
                bibliography to appear
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>
                Cite in your text using <code className="bg-muted px-1 py-0.5 rounded">\cite{"{smith2020impact}"}</code>{" "}
                with the citation key
              </span>
            </li>
          </ol>
          <div className="mt-4 flex justify-end">
            <a
              href="https://www.overleaf.com/learn/latex/Bibliography_management_in_LaTeX"
              className="text-primary text-sm font-medium flex items-center hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about LaTeX citations
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
