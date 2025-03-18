import pypdf
from langchain.schema import Document

def load_pdf(f):
    pdf_reader = pypdf.PdfReader(f)
    return [
        Document(
            page_content=page.extract_text(),
            metadata={"source": f.filename, "page": page_number},
        )
        for page_number, page in enumerate(pdf_reader.pages)
    ]
