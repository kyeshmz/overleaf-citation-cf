"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Check,
  Clock,
  Copy,
  Database,
  Download,
  FileText,
  HelpCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { detectCitationFormat, batchConvertCitations } from "@/utils/citation-converter"

const SAMPLE_CITATIONS = {
  doi: "10.1038/s41586-020-2649-2",
  apa: "Smith, J., & Jones, L. (2020). The impact of climate change on coastal ecosystems. Nature, 587(7832), 54-60.",
  mla: 'Smith, John, and Laura Jones. "The Impact of Climate Change on Coastal Ecosystems." Nature, vol. 587, no. 7832, 2020, pp. 54-60.',
}

interface ConversionHistoryItem {
  id: string
  input: string
  output: string
  format: string
  timestamp: number
}

export default function CitationConverter() {
  const [inputFormat, setInputFormat] = useState("doi")
  const [inputText, setInputText] = useState(SAMPLE_CITATIONS[inputFormat as keyof typeof SAMPLE_CITATIONS])
  const [outputText, setOutputText] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isConverted, setIsConverted] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [conversionSteps, setConversionSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [history, setHistory] = useState<ConversionHistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Load history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("citationHistory")
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        setHistory(parsedHistory)
      } catch (e) {
        console.error("Failed to parse history from localStorage", e)
      }
    }
  }, [])

  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("citationHistory", JSON.stringify(history))
    }
  }, [history])

  // Auto-detect format when input changes
  useEffect(() => {
    if (inputText.trim()) {
      const format = detectCitationFormat(inputText)
      setDetectedFormat(format)

      // Automatically switch tab if format is detected and different from current
      if (format && format !== inputFormat) {
        setInputFormat(format)
      }
    } else {
      setDetectedFormat(null)
    }
  }, [inputText, inputFormat])

  const handleConvert = async () => {
    if (!inputText.trim()) return

    setIsConverting(true)
    setIsConverted(false)

    // Set up conversion steps based on format
    const isDOI = inputFormat === "doi" || detectedFormat === "doi"
    const steps = isDOI
      ? ["Analyzing citations...", "Detecting formats...", "Fetching metadata from CrossRef...", "Generating BibTeX..."]
      : ["Analyzing citations...", "Detecting formats...", "Generating BibTeX..."]

    setConversionSteps(steps)
    setCurrentStep(0)

    // Simulate steps with shorter delays
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1
        clearInterval(stepInterval)
        return prev
      })
    }, 250)

    try {
      // Process the citations
      const { results, formats } = await batchConvertCitations(inputText)

      // Join the results with double newlines for readability
      const combinedResult = results.join("\n\n")

      setOutputText(combinedResult)
      setIsConverting(false)
      setIsConverted(true)
      clearInterval(stepInterval)

      // Add to history - store the first detected format or "multiple"
      const historyFormat = formats.length > 1 ? "multiple" : formats[0] || inputFormat

      const newHistoryItem: ConversionHistoryItem = {
        id: Date.now().toString(),
        input: inputText,
        output: combinedResult,
        format: historyFormat,
        timestamp: Date.now(),
      }

      setHistory((prev) => {
        const updatedHistory = [newHistoryItem, ...prev.slice(0, 19)]
        return updatedHistory
      })
    } catch (error) {
      console.error("Conversion error:", error)
      setOutputText(`Error during conversion: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsConverting(false)
      setIsConverted(true)
      clearInterval(stepInterval)
    }
  }

  const handleCopy = () => {
    if (!outputText) return

    navigator.clipboard.writeText(outputText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!outputText) return

    const blob = new Blob([outputText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "citation.bib"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  const handleFormatChange = (format: string) => {
    setInputFormat(format)
    setInputText(SAMPLE_CITATIONS[format as keyof typeof SAMPLE_CITATIONS])
    setIsConverted(false)
    setOutputText("")
  }

  const loadFromHistory = (item: ConversionHistoryItem) => {
    setInputFormat(item.format === "multiple" ? "doi" : item.format)
    setInputText(item.input)
    setOutputText(item.output)
    setIsConverted(true)
    setHistoryOpen(false)
  }

  const removeFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem("citationHistory")
  }

  // Filter history based on search query
  const filteredHistory = history.filter(
    (item) =>
      item.input.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.format.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Citation Converter</h2>
          <div className="flex items-center gap-2">
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Clock className="h-4 w-4" />
                  History {history.length > 0 && `(${history.length})`}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Conversion History</DialogTitle>
                </DialogHeader>
                <div className="relative mb-4">
                  <Input
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-8"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No conversion history yet</p>
                ) : filteredHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
                ) : (
                  <div className="flex justify-end mb-2">
                    <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 px-2">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}
                {filteredHistory.length > 0 && (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {filteredHistory.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => loadFromHistory(item)}
                          className="text-sm border rounded-md p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {item.format.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-1 mb-1">{item.input}</p>
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => removeFromHistory(item.id, e)}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </DialogContent>
            </Dialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Help</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" align="end" className="max-w-[300px]">
                  <div className="space-y-2">
                    <p className="font-medium">How to use:</p>
                    <ol className="text-sm space-y-1 list-decimal pl-4">
                      <li>Paste your citation(s) in the text box</li>
                      <li>For multiple citations, separate them with new lines or commas (for DOIs)</li>
                      <li>The format will be automatically detected</li>
                      <li>Click "Convert" to generate BibTeX</li>
                      <li>Copy or download the result</li>
                    </ol>
                    <div className="mt-2 pt-2 border-t text-xs">
                      <p className="font-medium mb-1">Features:</p>
                      <ul className="space-y-1 list-disc pl-4">
                        <li>DOIs are looked up in the CrossRef database for accurate metadata</li>
                        <li>Your conversion history is saved locally in your browser</li>
                      </ul>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Tabs value={inputFormat} onValueChange={handleFormatChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="doi">DOI</TabsTrigger>
            <TabsTrigger value="apa">APA</TabsTrigger>
            <TabsTrigger value="mla">MLA</TabsTrigger>
          </TabsList>

          <TabsContent value="doi" className="mt-0">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Paste DOI(s) here - separate multiple DOIs with commas or new lines"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    setIsConverted(false)
                  }}
                  className="min-h-[100px] resize-none"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {detectedFormat && (
                    <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {detectedFormat.toUpperCase()} detected
                    </Badge>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>DOIs are looked up in the CrossRef database for accurate metadata</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="apa" className="mt-0">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Paste APA citation(s) here - separate multiple citations with new lines"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    setIsConverted(false)
                  }}
                  className="min-h-[100px] resize-none"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {detectedFormat && (
                    <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {detectedFormat.toUpperCase()} detected
                    </Badge>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Paste your APA citation here</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mla" className="mt-0">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Paste MLA citation(s) here - separate multiple citations with new lines"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    setIsConverted(false)
                  }}
                  className="min-h-[100px] resize-none"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {detectedFormat && (
                    <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {detectedFormat.toUpperCase()} detected
                    </Badge>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Paste your MLA citation here</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center my-6">
          <Button onClick={handleConvert} disabled={isConverting || !inputText.trim()} className="w-40">
            {isConverting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              "Convert"
            )}
          </Button>
        </div>

        {/* Conversion Steps Animation */}
        {isConverting && (
          <div className="mb-6">
            <div className="bg-muted/50 rounded-md p-3">
              <div className="space-y-2">
                {conversionSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center"
                    style={{
                      opacity: index <= currentStep ? 1 : 0.3,
                      color:
                        index < currentStep
                          ? "var(--muted-foreground)"
                          : index === currentStep
                            ? "var(--foreground)"
                            : "var(--muted-foreground)",
                    }}
                  >
                    {index === currentStep ? (
                      <RefreshCw className="h-4 w-4 mr-2 text-primary animate-spin" />
                    ) : index < currentStep ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 mr-2" />
                    )}
                    <span className={`text-sm ${index === currentStep ? "font-medium" : ""}`}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          {isConverted && (
            <div>
              <div className="bg-muted p-4 rounded-md relative">
                <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words font-mono">{outputText}</pre>
                <div className="absolute top-2 right-2 flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={handleCopy} className="h-8 w-8">
                          {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          <span className="sr-only">{isCopied ? "Copied" : "Copy to clipboard"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={handleDownload} className="h-8 w-8">
                          {isDownloaded ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="sr-only">{isDownloaded ? "Downloaded" : "Download as .bib"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isDownloaded ? "Downloaded!" : "Download as .bib file"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="mt-2 text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <span>Ready to paste in your Overleaf document!</span>
                  <Copy className="h-3 w-3 text-primary" />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
