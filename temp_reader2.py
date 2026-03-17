import fitz

doc = fitz.open(r"c:\Users\arpan\OneDrive\Documents\code\Unstop\AI_Manufacturing_Planning_Document-1-20.pdf")
# the user wants from page 3 till the end. Page 1 is index 0. Page 3 is index 2.
for i in range(2, len(doc)):
    print(f"--- PAGE {i+1} ---")
    print(doc[i].get_text())
