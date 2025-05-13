interface Author {
  lastName: string
  firstName: string
  initials?: string
  fullName?: string
}

interface Citation {
  authors: Author[]
  title: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  year: string
  publisher?: string
  doi?: string
  url?: string
  type?: string
}

interface CrossRefAuthor {
  given?: string;
  family?: string;
  // Add other relevant fields if known
}

interface CrossRefMessage {
  author?: CrossRefAuthor[];
  title?: string[];
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  published?: {
    "date-parts"?: [[number, number?, number?]];
  };
  publisher?: string;
  DOI?: string; // DOI is usually part of the message or item, ensure field name is correct
  URL?: string;
  type?: string;
  // Add other relevant fields from the CrossRef API response
}

interface CrossRefResponse {
  message: CrossRefMessage;
  // Add other fields like status if needed
}

// Detect citation format based on input text
export function detectCitationFormat(text: string): string | null {
  text = text.trim()

  // Check if it's a DOI
  if (/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(text)) {
    return "doi"
  }

  // Check if it's APA format
  // APA typically has author, year in parentheses, title, and source
  // Updated to handle Volume(Issue) without space, e.g., 587(7832)
  if (/^.+ \(\d{4}\)\.\s.+\..+,\s\d+(?:\(\d+\))?,\s\d+(-|–)\d+\./.test(text)) {
    return "apa"
  }

  // Check if it's MLA format
  // MLA typically has author, title in quotes, source in italics, and publication details
  // Updated to make vol. and no. optional and anchor to end of string.
  if (/^.+\.\s".+"\s(.+?)(?:,\svol\.\s\d+)?(?:,\sno\.\s\d+)?(?:,\s\d{4})?,\spp\.\s\d+(-|–)\d+\.$/.test(text)) {
    return "mla"
  }

  // If no format is detected, return null
  return null
}

// Add a new function to split multiple citations
export function splitMultipleCitations(text: string): string[] {
  const normalizedText = text.replace(/\r\n/g, "\n");
  const lines = normalizedText.split(/\n+/).filter((line) => line.trim().length > 0);

  const finalCitations: string[] = [];

  for (const line of lines) {
    // Trim the line initially before attempting any splits
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Attempt to split by comma if it looks like a list of DOIs.
    // A DOI typically starts with "10."
    // Regex: split by comma, but only if the comma is (optionally) followed by whitespace and then "10."
    const doiSpecificCommaSplit = trimmedLine.split(/,(?=\s*10\.)/);

    let partsAreAllDOIs = false;
    if (doiSpecificCommaSplit.length > 1) {
      partsAreAllDOIs = doiSpecificCommaSplit.every(part =>
        detectCitationFormat(part.trim()) === "doi"
      );
    }

    if (partsAreAllDOIs) {
      // If all parts of the comma-split line are DOIs, add them individually after trimming
      finalCitations.push(...doiSpecificCommaSplit.map(part => part.trim()));
    } else {
      // Otherwise, treat the original trimmed line as a single citation.
      // This will handle APA/MLA, single DOIs, or lines that couldn't be confidently split as multiple DOIs.
      finalCitations.push(trimmedLine);
    }
  }
  return finalCitations;
}

// Add a new function to batch convert citations
export async function batchConvertCitations(input: string): Promise<{ results: string[]; formats: string[] }> {
  const citations = splitMultipleCitations(input)
  const results: string[] = []
  const formats: string[] = []

  // Process citations sequentially to avoid overwhelming the API
  for (const citation of citations) {
    const trimmedCitation = citation.trim()
    if (trimmedCitation) {
      const format = detectCitationFormat(trimmedCitation) || "unknown"
      formats.push(format)

      if (format !== "unknown") {
        try {
          const result = await convertCitation(trimmedCitation, format)
          results.push(result)
        } catch {
          results.push(`Error converting citation: ${trimmedCitation.substring(0, 50)}...`)
        }
      } else {
        results.push(`Error: Could not detect format for citation: ${trimmedCitation.substring(0, 50)}...`)
      }
    }
  }

  return { results, formats }
}

// Fetch metadata from CrossRef API
export async function fetchDOIMetadata(doi: string): Promise<Citation | null> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        Accept: "application/json",
        // Add a user-agent with contact info as recommended by CrossRef
        "User-Agent": "CiteToTeX/1.0 (https://citetotex.app; mailto:info@citetotex.app)",
      },
    })

    if (!response.ok) {
      // It's good practice to try and read the error response body if available
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        /* Ignore if can't read body */
      }
      throw new Error(`CrossRef API error: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const data = (await response.json()) as CrossRefResponse; // Cast to the defined type
    const item = data.message;

    if (!item) {
      throw new Error("No metadata found for this DOI")
    }

    // Parse authors
    const authors: Author[] = (item.author || []).map((author: CrossRefAuthor) => {
      const given = author.given || "";
      const family = author.family || "";

      // Extract initials from given name
      const initials = given
        .split(" ")
        .map((part: string) => part.charAt(0) + ".")
        .join(" ")

      return {
        firstName: given,
        lastName: family,
        initials: initials,
        fullName: `${given} ${family}`,
      }
    })

    // Get publication date
    const published = item.published
    const year = published
      ? published["date-parts"] && published["date-parts"][0]
        ? published["date-parts"][0][0].toString()
        : new Date().getFullYear().toString()
      : new Date().getFullYear().toString()

    // Get page numbers
    const pages = item.page ? item.page.replace(/^-/, "") : ""

    // Determine publication type
    let type = "article"
    if (item.type) {
      // Map CrossRef types to BibTeX types
      const typeMap: Record<string, string> = {
        "journal-article": "article",
        book: "book",
        "book-chapter": "inbook",
        "proceedings-article": "inproceedings",
        report: "techreport",
        dissertation: "phdthesis",
        dataset: "misc",
      }
      type = typeMap[item.type] || "article"
    }

    return {
      authors,
      title: item.title ? item.title[0] : "Unknown Title",
      journal: item["container-title"] ? item["container-title"][0] : undefined,
      volume: item.volume,
      issue: item.issue,
      pages,
      year,
      publisher: item.publisher,
      doi,
      url: item.URL,
      type,
    }
  } catch (err) {
    console.error("Error fetching DOI metadata:", err);
    return null;
  }
}

// Parse DOI citation
async function parseDOI(doi: string): Promise<Citation> {
  // Try to fetch metadata from CrossRef
  const metadata = await fetchDOIMetadata(doi)

  if (metadata) {
    return metadata
  }

  // Fallback to generating a placeholder citation if API fails
  console.log("Falling back to placeholder citation for DOI:", doi)

  // Extract potential year and author from DOI
  const parts = doi.split("/")
  const lastPart = parts[parts.length - 1]

  // Try to extract year if it exists in the DOI
  const yearMatch = lastPart.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()

  return {
    authors: [
      { lastName: "Smith", firstName: "John", initials: "J." },
      { lastName: "Jones", firstName: "Laura", initials: "L." },
    ],
    title: "Publication referenced by " + doi,
    journal: "Journal",
    volume: "",
    issue: "",
    pages: "",
    year: year,
    publisher: "Publisher",
    doi: doi,
    type: "article",
  }
}

// Parse APA citation
function parseAPA(citation: string): Citation {
  // Extract authors
  const authorMatch = citation.match(/^([^(]+)/)
  const authors = authorMatch ? parseAuthors(authorMatch[1]) : [{ lastName: "Unknown", firstName: "Author" }]

  // Extract year
  const yearMatch = citation.match(/$$(\d{4})$$/)
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

  // Extract title
  const titleMatch = citation.match(/\)\.\s([^.]+)/)
  const title = titleMatch ? titleMatch[1].trim() : "Unknown Title"

  // Extract journal
  const journalMatch = citation.match(/\.\s([^,]+),/)
  const journal = journalMatch ? journalMatch[1].trim() : "Unknown Journal"

  // Extract volume
  const volumeMatch = citation.match(/,\s(\d+)\(/)
  const volume = volumeMatch ? volumeMatch[1] : ""

  // Extract issue
  const issueMatch = citation.match(/$$(\d+)$$/g)
  const issue = issueMatch && issueMatch.length > 1 ? issueMatch[1].replace(/[()]/g, "") : ""

  // Extract pages
  const pagesMatch = citation.match(/,\s(\d+[-–]\d+)/)
  const pages = pagesMatch ? pagesMatch[1] : ""

  return {
    authors,
    title,
    journal,
    volume,
    issue,
    pages,
    year,
    publisher: "Publisher",
    type: "article",
  }
}

// Parse MLA citation
function parseMLA(citation: string): Citation {
  // Extract authors
  const authorMatch = citation.match(/^([^.]+)/)
  const authors = authorMatch ? parseAuthors(authorMatch[1]) : [{ lastName: "Unknown", firstName: "Author" }]

  // Extract title
  const titleMatch = citation.match(/"([^"]+)"/)
  const title = titleMatch ? titleMatch[1].trim() : "Unknown Title"

  // Extract journal
  const journalMatch = citation.match(/"\s([^,]+),/)
  const journal = journalMatch ? journalMatch[1].trim() : "Unknown Journal"

  // Extract volume
  const volumeMatch = citation.match(/vol\.\s(\d+)/)
  const volume = volumeMatch ? volumeMatch[1] : ""

  // Extract issue
  const issueMatch = citation.match(/no\.\s(\d+)/)
  const issue = issueMatch ? issueMatch[1] : ""

  // Extract year
  const yearMatch = citation.match(/(\d{4})/)
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

  // Extract pages
  const pagesMatch = citation.match(/pp\.\s(\d+[-–]\d+)/)
  const pages = pagesMatch ? pagesMatch[1] : ""

  return {
    authors,
    title,
    journal,
    volume,
    issue,
    pages,
    year,
    publisher: "Publisher",
    type: "article",
  }
}

// Helper function to parse authors from a string
function parseAuthors(authorString: string): Author[] {
  // Remove trailing punctuation
  authorString = authorString.replace(/[.,]$/, "")

  // Split by 'and' or '&' for multiple authors
  const authorParts = authorString.split(/,\s(?:and|&)\s|(?:and|&)\s/)

  return authorParts.map((part) => {
    // Clean up the part
    part = part.trim()

    // Check if it's in "Last, First" format
    if (part.includes(",")) {
      const [lastName, firstName] = part.split(",").map((p) => p.trim())
      // Extract initials if they exist
      const initialsMatch = firstName.match(/([A-Z]\.)/g)
      const initials = initialsMatch ? initialsMatch.join("") : undefined

      return { lastName, firstName, initials }
    } else {
      // Assume "First Last" format
      const nameParts = part.split(" ")
      const lastName = nameParts.pop() || "Unknown"
      const firstName = nameParts.join(" ") || "Unknown"

      return { lastName, firstName }
    }
  })
}

// Generate BibTeX citation key
function generateCitationKey(citation: Citation): string {
  const firstAuthor = citation.authors[0]
  const authorPart = firstAuthor ? firstAuthor.lastName.toLowerCase().replace(/\s+/g, "") : "unknown"
  const yearPart = citation.year || new Date().getFullYear().toString()
  const titlePart = citation.title.split(/\s+/)[0].toLowerCase().replace(/[^\w]/g, "")

  return `${authorPart}${yearPart}${titlePart}`
}

// Format authors for BibTeX
function formatBibTeXAuthors(authors: Author[]): string {
  return authors
    .map((author) => {
      if (author.initials) {
        return `${author.lastName}, ${author.initials}`
      } else {
        return `${author.lastName}, ${author.firstName}`
      }
    })
    .join(" and ")
}

// Convert citation to BibTeX format
function formatBibTeX(citation: Citation): string {
  const citationKey = generateCitationKey(citation)
  const authors = formatBibTeXAuthors(citation.authors)
  const entryType = citation.type || "article"

  let bibTeX = `@${entryType}{${citationKey},\n`
  bibTeX += `  author = {${authors}},\n`
  bibTeX += `  title = {${citation.title}},\n`
  bibTeX += `  year = {${citation.year}},\n`

  if (citation.journal) bibTeX += `  journal = {${citation.journal}},\n`
  if (citation.volume) bibTeX += `  volume = {${citation.volume}},\n`
  if (citation.issue) bibTeX += `  number = {${citation.issue}},\n`
  if (citation.pages) bibTeX += `  pages = {${citation.pages.replace("-", "--")}},\n`
  if (citation.publisher) bibTeX += `  publisher = {${citation.publisher}},\n`
  if (citation.doi) bibTeX += `  doi = {${citation.doi}},\n`
  if (citation.url) bibTeX += `  url = {${citation.url}},\n`

  // Remove trailing comma and add closing brace
  bibTeX = bibTeX.replace(/,\n$/, "\n")
  bibTeX += `}`

  return bibTeX
}

// Main conversion function
export async function convertCitation(input: string, format: string): Promise<string> {
  try {
    let citation: Citation

    switch (format) {
      case "doi":
        citation = await parseDOI(input.trim())
        break
      case "apa":
        citation = parseAPA(input.trim())
        break
      case "mla":
        citation = parseMLA(input.trim())
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    return formatBibTeX(citation)
  } catch (error) {
    console.error("Error converting citation:", error)
    return `Error converting citation. Please check your input and try again.\n\nDetails: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
