import sys
from pypdf import PdfReader

try:
    reader = PdfReader(r"c:\Users\arpan\OneDrive\Documents\code\Unstop\AI_Manufacturing_Planning_Document-1-20.pdf")
    # Start reading from page 3 (which is index 2)
    for i in range(2, len(reader.pages)):
        text = reader.pages[i].extract_text()
        if text:
            print(f"--- PAGE {i+1} ---")
            print(text.strip())
            print("\n")
except Exception as e:
    print(f"Error: {e}")
