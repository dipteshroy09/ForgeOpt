import fitz
import sys

try:
    doc = fitz.open(r"c:\Users\arpan\OneDrive\Documents\code\Unstop\AI_Manufacturing_Planning_Document-1-20.pdf")
    with open(r"c:\Users\arpan\OneDrive\Documents\code\Unstop\extracted_pdf.txt", "w", encoding="utf-8") as f:
        # User requested from page 3 till the end (index 2 to end)
        for i in range(2, len(doc)):
            f.write(f"\n--- PAGE {i+1} ---\n")
            f.write(doc[i].get_text())
    print("DONE extracting.")
except Exception as e:
    print(f"Error: {e}")
