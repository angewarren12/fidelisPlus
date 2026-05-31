import zipfile
import xml.etree.ElementTree as ET
import re
import os

def extract_text_from_pptx(pptx_path):
    print(f"\n==================================================")
    print(f"EXTRACTING TEXT FROM: {os.path.basename(pptx_path)}")
    print(f"==================================================")
    
    if not os.path.exists(pptx_path):
        print("Error: File not found.")
        return
        
    try:
        with zipfile.ZipFile(pptx_path, 'r') as zip_ref:
            # List all slide files in ppt/slides/
            slide_files = [f for f in zip_ref.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
            # Sort slides numerically
            slide_files.sort(key=lambda x: int(re.findall(r'\d+', x)[0]))
            
            for slide_file in slide_files:
                slide_num = re.findall(r'\d+', slide_file)[0]
                print(f"\n--- Slide {slide_num} ---")
                
                xml_content = zip_ref.read(slide_file)
                root = ET.fromstring(xml_content)
                
                # ElementTree namespaces for slide XML
                namespaces = {
                    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
                    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
                    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'
                }
                
                # Find all text elements <a:t>
                text_elements = root.findall('.//a:t', namespaces)
                slide_text = []
                for elem in text_elements:
                    if elem.text:
                        slide_text.append(elem.text.strip())
                
                if slide_text:
                    print(" | ".join(slide_text))
                else:
                    print("[No text found on this slide]")
    except Exception as e:
        print(f"Error reading file: {str(e)}")

pptx_1 = r"c:\Users\USER2\.gemini\antigravity\scratch\fidlisSass\fidelis_plus\CARTE DE FIDELITE -2025.pptx"
pptx_2 = r"c:\Users\USER2\.gemini\antigravity\scratch\fidlisSass\fidelis_plus\Carte de Fidelité Mayelia -Version Simplifié 2026.pptx"

extract_text_from_pptx(pptx_1)
extract_text_from_pptx(pptx_2)
