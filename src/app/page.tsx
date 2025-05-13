import CitationConverter from "@/components/citation-converter"
import FeatureSection from "@/components/feature-section"
import Footer from "@/components/footer"
import Header from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 md:py-24">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Citation to Overleaf Converter</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Convert citations from DOI, APA, MLA, and more to LaTeX format for your Overleaf projects in seconds.
            </p>
          </div>

          <CitationConverter />
        </section>

        <FeatureSection />
      </main>
      <Footer />
    </div>
  )
}
